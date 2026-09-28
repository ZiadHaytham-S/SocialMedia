import { OAuth2Client, TokenPayload } from "google-auth-library";
import { EmailEnum, ProviderEnum } from "../../common/enums";
import { BadRequestException, ConflictException, NotFoundException } from "../../common/exceptions";
import { redisService, RedisService, TokenService } from "../../common/services";
import { createOtp } from "../../common/utils/createOtp";
import { emailEvent, sendEmail, templateEmail } from "../../common/utils/email";
import {
  assignPlainPassword,
  comparePassword,
  generateHash,
  isPasswordSameAsCurrent,
  isPasswordUsedBefore,
} from "../../common/utils/security";
import { UserRepository } from "../../DB/repository/user.repository";
import { ConfirmEmailDto, LoginDto, ResendConfirmEmailDto, SignupDto } from "./auth.Dto";
import { ILoginResponse } from "./auth.entity";
import { CLIENT_ID } from "../../config/config";

class AuthenticationService {
  private readonly userRepository: UserRepository;
  private readonly redis : RedisService;
  private readonly tokenService : TokenService
  constructor() {
    this.userRepository = new UserRepository();
    this.redis = redisService;
    this.tokenService = new TokenService()
  }

  

 private async sendEmailOtp({ email, subject, title } : {email:string , subject:EmailEnum , title:string}) {
  const isBlocked = await this.redis.ttl(await this.redis.blockOtpKey({ email, subject }));
  if (isBlocked > 0) {
    throw new BadRequestException( `Sorry we cannot request new otp while you are blocked  please try again after ${isBlocked}`)
  }
  const reaminingOtpTTL = await this.redis.ttl(await this.redis.otpKey({ email, subject }));
  if (reaminingOtpTTL > 0) {
    throw new BadRequestException( `Sorry we cannot request new otp while current otp still active please try again after ${reaminingOtpTTL}s`)
  }

  const maxTrial = await this.redis.get(await this.redis.maxAttemptOtpKey({ email, subject }))
  if (maxTrial >= 3) {
    await this.redis.set({
      key: await this.redis.blockOtpKey({ email, subject }),
      value: 1,
      ttl: 420
    })
    throw new BadRequestException( "you have reached the max trial")
  }


  const code = await createOtp();

  await this.redis.set({
    key: await this.redis.otpKey({ email, subject }),
    value: await generateHash({ plainText: `${code}` }),
    ttl: 120
  })

  await emailEvent.emit("sendEmail", async () => {
    await sendEmail({
      to: email,
      subject,
      html: templateEmail({ code, title }),
    })

    await this.redis.incr(await this.redis.maxAttemptOtpKey({ email, subject }))
  })
}


 async login(inputs:LoginDto, issuer:string):Promise<ILoginResponse> {
  const { email, password } = inputs;
  const user = await this.userRepository.findOne({
    filter: { email, provider: ProviderEnum.SYSTEM, confirmEmail: { $exists: true } },
  });

  if (!user) {
    throw new NotFoundException("Invalid Login Credential")
  }

  const match = await comparePassword(password, user.password as string);


  if (!match) {
       throw new NotFoundException("Invalid Login Credential")
  }

  return await this.tokenService.createLoginCredentials(user , issuer)
};


  
  async signup({ email, password, username, phone, gender, DOB }: SignupDto): Promise<string> {
    const checkUserExist = await this.userRepository.findOne({
      filter: { email },
      projection: "email",
      options: { lean: false },
    });
    if (checkUserExist) {
      throw new ConflictException("Email Already Exist");
    }

    const user = await this.userRepository.createOne({
      data: {
        email,
        password, // plain text — hashed once by userSchema pre("save")
        username,
        phone,
        gender,
        DOB,
      },
    });
    if (!user) {
      throw new BadRequestException("Fail");
    }
    await this.sendEmailOtp({email, subject:EmailEnum.ConfirmEmail , title:"Verify-Email"})
    return 'Account created Successfully pleas check your inbox email and verify account';
  }



   public async confirmEmail({ email, otp }: ConfirmEmailDto, issuer: string): Promise<ILoginResponse> {
  const account = await this.userRepository.findOne({
    filter: { email, confirmEmail: { $exists: false }, provider: ProviderEnum.SYSTEM },
  });
  if (!account) {
    throw new NotFoundException("Fail to find matching account")
  }

  const hashOtp = await this.redis.get(await this.redis.otpKey({ email, subject: EmailEnum.ConfirmEmail }))
  if (!hashOtp) {
    throw new NotFoundException("Expired otp")
  }
  if (!(await comparePassword(otp, hashOtp))) {
throw new ConflictException("Invalid otp")  }
  account.confirmEmail = new Date();
  await account.save()
  await this.redis.deleteKey(await this.redis.keys(await this.redis.otpKey({ email })))
  return await this.tokenService.createLoginCredentials(account, issuer);
};


// resend confirm email
 public async resendConfirmEmail({email} : ResendConfirmEmailDto){
  const account = await this.userRepository.findOne({
    filter: { email, confirmEmail: { $exists: false }, provider: ProviderEnum.SYSTEM },
  });
  if (!account) {
    throw new NotFoundException("Fail to find matching account or account is verify")
  }


  await this.sendEmailOtp({ email, subject: EmailEnum.ConfirmEmail, title: "Verify Email" })

  return;
};

// google

 private async verifyGoogleAccount(idToken:string):Promise<TokenPayload> {

  const client = new OAuth2Client();

  const ticket = await client.verifyIdToken({
    idToken,
    audience:CLIENT_ID
  })
  const payload = ticket.getPayload();
  if (!payload?.email_verified) {
    throw new BadRequestException("Fail to verify this account with google")
  }
  return payload
}

 async loginWithGmail(idToken:string , issuer:string) {
  const payload = await this.verifyGoogleAccount(idToken)
  const user = await this.userRepository.findOne({
    filter:{
      email:payload.email as string ,
      provider:ProviderEnum.GOOGLE
    }
  })

  if (!user) {
   throw new NotFoundException("Invalid login credentials or invalid login approach")
  }

  return await this.tokenService.createLoginCredentials(user, issuer)

}


async signupWithGmail(idToken:string , issuer:string) {
  const payload = await this.verifyGoogleAccount(idToken)

  const checkEmailExist = await this.userRepository.findOne({  filter: { email: payload.email as string } })
  if (checkEmailExist) {
    if (checkEmailExist?.provider !== ProviderEnum.GOOGLE) {
      throw new ConflictException("account already exist with different provider")
    }
    const account = await this.loginWithGmail(idToken , issuer)
    return { account, status: 200 }
  }

  const user = await this.userRepository.createOne({
    data: {
      firstName: payload.given_name as string,
      lastName: payload.family_name as string,
      email: payload.email as string,
      provider: ProviderEnum.GOOGLE,
      profilePicture: payload.picture as string,
      confirmEmail: new Date()

    }
  })
  return { status:201 , credentials: await this.tokenService.createLoginCredentials(user , issuer) }

}


// password

async requestForgotPasswordOtp (email:string) {

  const account = await this.userRepository.findOne({
    filter: {
      email,
      confirmEmail: { $exists: true },
      provider: ProviderEnum.SYSTEM
    }
  })

  if (!account) {
    throw new NotFoundException("Fail to find matching account")
  }

  await this.sendEmailOtp({ email, subject: EmailEnum.ForgotPassword, title: "Reset Password" })
  return;
}


async verifyForgotPasswordOtp ({email,otp}:{email:string , otp:string}) {
 const key = this.redis.otpKey({ email, subject: EmailEnum.ForgotPassword });

const hashOtp = await this.redis.get(key);

if (!hashOtp) {
  throw new ConflictException("Expired Otp");
}

if (!(await comparePassword(otp, hashOtp))) {
  throw new ConflictException("Invalid Otp");
}
  return;
}

async resetForgotPasswordOtp({
  email,
  password,
  otp
}: {
  email: string;
  password: string;
  otp: string;
}) {
  await this.verifyForgotPasswordOtp({ email, otp });

  const user = await this.userRepository.findOne({
    filter: {
      email,
      confirmEmail: { $exists: true },
      provider: ProviderEnum.SYSTEM
    }
  });

  if (!user) {
    throw new NotFoundException("account not exist");
  }

  if (await isPasswordSameAsCurrent(password, user.password as string)) {
    throw new ConflictException("New password must be different from current password");
  }

  if (await isPasswordUsedBefore(user, password)) {
    throw new ConflictException("This Password is already used before");
  }

  assignPlainPassword(user, password);
  await user.save();

  const tokenKeys = await this.redis.keys(this.redis.baseRevokeTokenKey(user._id));

  await this.redis.deleteKey(tokenKeys);
}

}

export default new AuthenticationService();
