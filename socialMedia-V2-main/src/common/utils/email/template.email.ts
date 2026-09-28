import { APPLICATION_NAME, FACEBOOK_LINK, INSTAGRAM_LINK, X_LINK } from "../../../config/config.js";


export const templateEmail = ({ code, title } : {
    code: number,
    title:string
}):string => {
    return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${title}</title>
  </head>

  <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
    
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;">
      <tr>
        <td align="center">

          <!-- Card -->
          <table width="420" cellpadding="0" cellspacing="0" 
            style="background:#ffffff;border-radius:12px;padding:30px;
            box-shadow:0 5px 20px rgba(0,0,0,0.08);">

            <!-- Logo -->
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <h2 style="margin:0;color:#111;">${APPLICATION_NAME}</h2>
              </td>
            </tr>

            <!-- Title -->
            <tr>
              <td align="center">
                <h3 style="margin:0;color:#333;">${title}</h3>
              </td>
            </tr>

            <!-- Description -->
            <tr>
              <td align="center" style="padding:15px 0;">
                <p style="margin:0;color:#666;font-size:14px;">
                  Use the following verification code to continue
                </p>
              </td>
            </tr>

            <!-- OTP Box -->
            <tr>
              <td align="center">
                <div style="
                  display:inline-block;
                  padding:15px 30px;
                  font-size:28px;
                  letter-spacing:6px;
                  font-weight:bold;
                  background:#111;
                  color:#fff;
                  border-radius:8px;
                  margin:10px 0 20px 0;
                ">
                  ${code}
                </div>
              </td>
            </tr>

            <!-- Expire Note -->
            <tr>
              <td align="center">
                <p style="font-size:12px;color:#999;">
                  This code will expire in 2 minutes
                </p>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td>
                <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center">
                <p style="font-size:12px;color:#aaa;margin:0;">
                  If you didn't request this, you can safely ignore this email.
                </p>
              </td>
            </tr>

            <!-- Social -->
            <tr>
              <td align="center" style="padding-top:15px;">
                <a href="${FACEBOOK_LINK}" style="margin:0 5px;text-decoration:none;">Facebook</a>
                |
                <a href="${INSTAGRAM_LINK}" style="margin:0 5px;text-decoration:none;">Instagram</a>
                |
                <a href="${X_LINK}" style="margin:0 5px;text-decoration:none;">X</a>
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>

  </body>
  </html>
  `;
};