import { HydratedDocument, model, models, Schema } from "mongoose";
import { GenderEnum, ProviderEnum, RoleEnum } from "../../common/enums";
import { IUser } from "../../common/interfaces";
import { generateEncryption, hashPlainPassword, hashPasswordFieldsInUpdateQuery } from "../../common/utils/security";

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: function (this) {
        return this.provider == ProviderEnum.SYSTEM;
      },
    },
    profileVisitCount: {
      type: Number,
      default: 0,
    },
    oldPassword: {
      type: [String],
      default: [],
    },
    phone: { type: String },
    profilePicture: {
      key: String,
      url: String,
    },
    profileCoverPictures: [
      {
        key: String,
        url: String,
      },
    ],
    gender: { type: Number, enum: GenderEnum, default: GenderEnum.MALE },
    provider: {
      type: Number,
      enum: ProviderEnum,
      default: ProviderEnum.SYSTEM,
    },
    role: { type: Number, enum: RoleEnum, default: RoleEnum.USER },

    changeTimeCredentials: Date,
    DOB: Date,
    confirmEmail: Date,
    deletedAt: Date,
    restoredAt: Date,
  },
  {
    strict: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
    autoIndex: true,
  },
);
userSchema
  .virtual("username")
  .set(function (value: string) {
    const parts = value.trim().split(" ");

    this.firstName = parts[0] as string;
    this.lastName = parts.slice(1).join(" ") || " ";
  })
  .get(function () {
    return `${this.firstName} ${this.lastName}`;
  });

userSchema.pre("save", async function (this: HydratedDocument<IUser>) {
  if (this.password && this.isModified("password")) {
    this.password = await hashPlainPassword(this.password as string);
  }

  if (this.phone && this.isModified("phone")) {
    this.phone = await generateEncryption(this.phone);
  }
});

userSchema.pre(["findOne", "find"], function () {
  const query = this.getQuery();

  if (query.paranoid === false) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ ...query, deletedAt: { $exists: false } });
  }
});

userSchema.pre(["updateOne", "findOneAndUpdate"], async function () {
  const update = this.getUpdate();

  await hashPasswordFieldsInUpdateQuery(update);

  const typedUpdate = update as HydratedDocument<IUser>;

  if (typedUpdate?.deletedAt) {
    this.setUpdate({ ...typedUpdate, $unset: { restoredAt: 1 } });
  }

  if (typedUpdate?.restoredAt) {
    this.setUpdate({ ...typedUpdate, $unset: { deletedAt: 1 } });
    this.setQuery({ ...this.getQuery(), deletedAt: { $exists: true } });
  }

  const query = this.getQuery();

  if (query.paranoid === false) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ deletedAt: { $exists: false }, ...query });
  }
});

userSchema.pre(["deleteOne", "findOneAndDelete"], function () {
  const query = this.getQuery();

  if (query.force === true) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ ...query, deletedAt: { $exists: true } });
  }
});

export const UserModel = models.User || model<IUser>("User", userSchema);
