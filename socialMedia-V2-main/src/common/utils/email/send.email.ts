import nodemailer  from 'nodemailer'
import Mail from 'nodemailer/lib/mailer'
import { APPLICATION_EMAIL, APPLICATION_NAME, APPLICATION_PASSWORD } from "../../../config/config";
import { BadRequestException } from '../../exceptions';


export const sendEmail = async ({
    to,
    cc,
    bcc,
    html,
    subject,
    attachments = []
} : Mail.Options) => {
    if (!to && !cc && !bcc) {
        throw new BadRequestException("Invalid recipient")
    }
    if (!(html as string)?.length && !attachments?.length) {
        throw new BadRequestException("Invalid mail content")
    }
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: APPLICATION_EMAIL,
            pass: APPLICATION_PASSWORD,
        },
    });

    const info = await transporter.sendMail({
        to,
        cc,
        bcc,
        subject,
        attachments,
        html,
        from: `"${APPLICATION_NAME}" <${APPLICATION_EMAIL}>`

    });

    console.log("Message sent: %s", info.messageId);
}
