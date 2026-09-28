import { DeleteOptions, UpdateOptions } from "mongodb";
import {
  AnyKeys,
  CreateOptions,
  DeleteResult,
  FlattenMaps,
  HydratedDocument,
  Model,
  PopulateOptions,
  ProjectionType,
  QueryFilter,
  QueryOptions,
  Types,
  UpdateQuery,
  UpdateResult,
  UpdateWithAggregationPipeline,
} from "mongoose";

function withVersionIncrement<TRawDoc>(
  update: UpdateQuery<TRawDoc> | UpdateWithAggregationPipeline | undefined,
): UpdateQuery<TRawDoc> | UpdateWithAggregationPipeline {
  if (!update || Array.isArray(update)) {
    return update ?? {};
  }

  const operators = update as UpdateQuery<TRawDoc>;

  return {
    ...operators,
    $inc: {
      ...(operators.$inc ?? {}),
      __v: 1,
    },
  };
}

export abstract class DataBaseRepository<TRawDoc> {
  constructor(protected readonly model: Model<TRawDoc>) {}

  async create({
    data,
  }: {
    data: AnyKeys<TRawDoc>;
  }): Promise<HydratedDocument<TRawDoc>>;

  async create({
    data,
    options,
  }: {
    data: AnyKeys<TRawDoc>[];
    options?: CreateOptions | undefined;
  }): Promise<HydratedDocument<TRawDoc>[]>;

  async create({
    data,
    options,
  }: {
    data: AnyKeys<TRawDoc> | AnyKeys<TRawDoc>[];
    options?: CreateOptions | undefined;
  }): Promise<HydratedDocument<TRawDoc>[] | HydratedDocument<TRawDoc>> {
    return await this.model.create(data as any, options);
  }

  async createOne({
    data,
    options,
  }: {
    data: AnyKeys<TRawDoc>;
    options?: CreateOptions | undefined;
  }): Promise<HydratedDocument<TRawDoc>> {
    const [doc] = (await this.create({ data: [data], options })) || [];
    return doc as HydratedDocument<TRawDoc>;
  }

  //   finders

  async findOne({
    filter,
    projection,
    options,
  }: {
    filter?: QueryFilter<TRawDoc>;
    projection?: ProjectionType<TRawDoc> | null | undefined;
    options?: (QueryOptions<TRawDoc> & { lean?: false }) | null | undefined;
  }): Promise<HydratedDocument<TRawDoc> | null>;

  async findOne({
    filter,
    projection,
    options,
  }: {
    filter?: QueryFilter<TRawDoc>;
    projection?: ProjectionType<TRawDoc> | null | undefined;
    options?: (QueryOptions<TRawDoc> & { lean: true }) | null | undefined;
  }): Promise<null | FlattenMaps<TRawDoc>>;

  async findOne({
    filter,
    projection,
    options,
  }: {
    filter?: QueryFilter<TRawDoc>;
    projection?: ProjectionType<TRawDoc> | null | undefined;
    options?: QueryOptions<TRawDoc> | null | undefined;
  }): Promise<any> {
    const doc = this.model.findOne(filter, projection, options);
    if (options?.populate)
      doc?.populate(options.populate as unknown as PopulateOptions);
    if (options?.lean) doc?.lean(options.lean);

    return await doc.exec();
  }
  async find({
    filter,
    projection,
    options,
  }: {
    filter?: QueryFilter<TRawDoc>;
    projection?: ProjectionType<TRawDoc> | null | undefined;
    options?: QueryOptions<TRawDoc> | null | undefined;
  }): Promise<HydratedDocument<TRawDoc>[]> {
    const doc = this.model.find(
      filter as any,
      projection,
      options || undefined,
    );
    if (options?.populate) doc?.populate(options.populate as PopulateOptions[]);
    if (options?.lean) doc?.lean(options.lean);

    return await doc.exec();
  }

  async findById({
    id,
    projection,
    options,
  }: {
    id: Types.ObjectId;
    projection?: ProjectionType<TRawDoc> | null | undefined;
    options?: QueryOptions<TRawDoc> | null | undefined;
  }): Promise<any> {
    const doc = this.model.findById(id, projection, options);
    if (options?.populate)
      doc?.populate(options.populate as unknown as PopulateOptions);
    if (options?.lean) doc?.lean(options.lean);

    return (await doc.exec()) as unknown as HydratedDocument<TRawDoc>[];
  }

  async count({ filter }: { filter?: QueryFilter<TRawDoc> }): Promise<number> {
    return await this.model.countDocuments(filter);
  }

  // update

  async findByIdAndUpdate({
    id,
    update = {},
    options,
  }: {
    id?: Types.ObjectId | string;
    update?: UpdateQuery<TRawDoc>;
    options?: QueryOptions<TRawDoc> | null;
  }): Promise<HydratedDocument<TRawDoc> | null> {
    return await this.model.findByIdAndUpdate(
      id,
      withVersionIncrement(update),
      {
        returnDocument: "after",
        ...options,
      },
    );
  }

  async findOneAndUpdate({
    filter,
    update,
    options = { returnDocument: "before" },
  }: {
    filter?: QueryFilter<TRawDoc>;
    update?: UpdateQuery<TRawDoc>;
    options?: QueryOptions<TRawDoc> | null;
  }): Promise<HydratedDocument<TRawDoc> | null> {
    return await this.model.findOneAndUpdate(
      filter,
      withVersionIncrement(update),
      options,
    );
  }

  async updateOne({
    filter,
    update,
    options,
  }: {
    filter: QueryFilter<TRawDoc>;
    update: UpdateQuery<TRawDoc> | UpdateWithAggregationPipeline;
    options?: UpdateOptions | null;
  }): Promise<UpdateResult> {
    return await this.model.updateOne(filter, withVersionIncrement(update), options);
  }

  async updateMany({
    filter,
    update,
    options,
  }: {
    filter: QueryFilter<TRawDoc>;
    update: UpdateQuery<TRawDoc> | UpdateWithAggregationPipeline;
    options?: UpdateOptions | null;
  }): Promise<UpdateResult> {
    return await this.model.updateMany(filter, withVersionIncrement(update), options);
  }

  // DELETE
  async findByIdAndDelete({
    id,
  }: {
    id?: Types.ObjectId;
  }): Promise<HydratedDocument<TRawDoc> | null> {
    return await this.model.findByIdAndDelete(id);
  }
  async findOneAndDelete({
    filter,
  }: {
    filter: QueryFilter<TRawDoc>;
  }): Promise<HydratedDocument<TRawDoc> | null> {
    return await this.model.findOneAndDelete(filter);
  }
  async deleteOne({
    filter,
    options,
  }: {
    filter?: QueryFilter<TRawDoc>;
    options?: DeleteOptions | null;
  }): Promise<DeleteResult> {
    return await this.model.deleteOne(filter, options);
  }
  async deleteMany({
    filter,
    options,
  }: {
    filter?: QueryFilter<TRawDoc>;
    options?: DeleteOptions | null;
  }): Promise<DeleteResult> {
    return await this.model.deleteMany(filter, options);
  }
}
