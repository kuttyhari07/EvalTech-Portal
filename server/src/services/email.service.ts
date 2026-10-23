import nodemailer from 'nodemailer';
import { config } from '../config/env';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      if (config.SMTP_USER && config.SMTP_PASS) {
        this.transporter = nodemailer.createTransport({
          host: config.SMTP_HOST,
          port: config.SMTP_PORT,
          secure: config.SMTP_PORT === 465,
          auth: {
            user: config.SMTP_USER,
            pass: config.SMTP_PASS,
          },
        });
      } else {
        // Fallback for development: use JSON / console logger transport
        this.transporter = nodemailer.createTransport({
          jsonTransport: true,
        });
      }
    }
    return this.transporter;
  }

  private static wrapTemplate(title: string, bodyContent: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0F172A; color: #F8FAFC; margin: 0; padding: 24px; }
          .container { max-width: 600px; margin: 0 auto; background: #1E293B; border-radius: 12px; border: 1px solid #334155; overflow: hidden; }
          .header { background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%); padding: 32px; text-align: center; border-bottom: 1px solid #4338CA; }
          .logo { font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; }
          .logo span { color: #818CF8; }
          .content { padding: 32px; color: #E2E8F0; line-height: 1.6; }
          .btn { display: inline-block; padding: 12px 28px; background: #4F46E5; color: #FFFFFF !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
          .footer { padding: 20px 32px; background: #0F172A; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #334155; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Eval<span>Tech</span></div>
            <p style="margin: 6px 0 0; color: #C7D2FE; font-size: 14px;">Next-Gen Examination SaaS</p>
          </div>
          <div class="content">
            <h2 style="color: #FFFFFF; margin-top: 0;">${title}</h2>
            ${bodyContent}
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} EvalTech Inc. All rights reserved. Secure Automated Examination Delivery.
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail({
        from: config.EMAIL_FROM,
        to,
        subject,
        html,
      });

      console.log(`[Email] Dispatched to ${to} | Subject: "${subject}" | MessageId: ${info.messageId}`);
      return true;
    } catch (err: any) {
      console.error(`[Email] Failed to send email to ${to}:`, err.message);
      return false;
    }
  }

  static async sendVerificationEmail(email: string, name: string, token: string): Promise<boolean> {
    const link = `${config.CLIENT_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    const html = this.wrapTemplate(
      'Verify Your EvalTech Account',
      `
        <p>Hello ${name},</p>
        <p>Thank you for signing up for EvalTech. To complete your registration and activate your workspace, please verify your email address:</p>
        <div style="text-align: center;">
          <a href="${link}" class="btn">Verify Email Address</a>
        </div>
        <p style="font-size: 13px; color: #94A3B8; margin-top: 24px;">If you did not create an account, you can safely ignore this email.</p>
      `
    );
    return this.sendMail(email, 'Verify your EvalTech Account', html);
  }

  static async sendStaffInvitation(
    email: string,
    orgName: string,
    inviterName: string,
    token: string
  ): Promise<boolean> {
    const link = `${config.CLIENT_URL}/join-org?token=${token}&email=${encodeURIComponent(email)}`;
    const html = this.wrapTemplate(
      `Invitation to Join ${orgName}`,
      `
        <p>Hello,</p>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on EvalTech as a Staff / Teacher member.</p>
        <p>You will be able to create exams, manage assigned classes, build question banks, and evaluate results seamlessly.</p>
        <div style="text-align: center;">
          <a href="${link}" class="btn">Accept Invitation & Set Up Account</a>
        </div>
      `
    );
    return this.sendMail(email, `Invitation to join ${orgName} on EvalTech`, html);
  }

  static async sendExamNotification(
    email: string,
    studentName: string,
    examTitle: string,
    examCode: string,
    startsAt: Date,
    durationMinutes: number
  ): Promise<boolean> {
    const examLink = `${config.CLIENT_URL}/exam/${examCode}`;
    const formattedDate = new Date(startsAt).toLocaleString();
    const html = this.wrapTemplate(
      `Upcoming Examination: ${examTitle}`,
      `
        <p>Hello ${studentName},</p>
        <p>You have been scheduled for an online examination:</p>
        <div style="background: #0F172A; padding: 16px; border-radius: 8px; border-left: 4px solid #4F46E5; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Exam:</strong> ${examTitle}</p>
          <p style="margin: 4px 0;"><strong>Access Code:</strong> <span style="font-family: monospace; color: #818CF8; font-size: 16px; font-weight: bold;">${examCode}</span></p>
          <p style="margin: 4px 0;"><strong>Scheduled Time:</strong> ${formattedDate}</p>
          <p style="margin: 4px 0;"><strong>Duration:</strong> ${durationMinutes} minutes</p>
        </div>
        <div style="text-align: center;">
          <a href="${examLink}" class="btn">Access Exam Portal</a>
        </div>
      `
    );
    return this.sendMail(email, `Scheduled Exam: ${examTitle} (Code: ${examCode})`, html);
  }

  static async sendExamResultEmail(
    email: string,
    studentName: string,
    examTitle: string,
    totalScore: number,
    maxScore: number,
    percentage: number,
    isPassed: boolean,
    examCode: string,
    extraMetrics?: {
      examDate?: Date;
      programmingScore?: number;
      programmingMaxScore?: number;
      evaluationStatus?: string;
    }
  ): Promise<boolean> {
    const statusColor = isPassed ? '#10B981' : '#EF4444';
    const statusText = isPassed ? 'PASSED' : 'NOT PASSED';
    const resultLink = `${config.CLIENT_URL}/student/results?email=${encodeURIComponent(email)}&examCode=${examCode}`;
    const examDateStr = (extraMetrics?.examDate || new Date()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const hasProgramming =
      extraMetrics?.programmingMaxScore !== undefined &&
      extraMetrics.programmingMaxScore > 0;

    const html = this.wrapTemplate(
      `Your EvalTech Examination Result Is Available`,
      `
        <p>Hello ${studentName},</p>
        <p>Your examination result for <strong>${examTitle}</strong> is now available.</p>
        
        <div style="background: #0F172A; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #334155;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #E2E8F0;">
            <tr style="border-bottom: 1px solid #1E293B;">
              <td style="padding: 8px 0; color: #94A3B8;">Exam Title</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #FFFFFF;">${examTitle}</td>
            </tr>
            <tr style="border-bottom: 1px solid #1E293B;">
              <td style="padding: 8px 0; color: #94A3B8;">Exam Date</td>
              <td style="padding: 8px 0; text-align: right; color: #FFFFFF;">${examDateStr}</td>
            </tr>
            <tr style="border-bottom: 1px solid #1E293B;">
              <td style="padding: 8px 0; color: #94A3B8;">Total Marks</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #FFFFFF;">${maxScore}</td>
            </tr>
            <tr style="border-bottom: 1px solid #1E293B;">
              <td style="padding: 8px 0; color: #94A3B8;">Marks Obtained</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #818CF8; font-size: 16px;">${totalScore}</td>
            </tr>
            <tr style="border-bottom: 1px solid #1E293B;">
              <td style="padding: 8px 0; color: #94A3B8;">Percentage</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #FFFFFF;">${percentage}%</td>
            </tr>
            ${
              hasProgramming
                ? `
            <tr style="border-bottom: 1px solid #1E293B;">
              <td style="padding: 8px 0; color: #94A3B8;">Programming Score</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #38BDF8;">
                ${extraMetrics?.programmingScore} / ${extraMetrics?.programmingMaxScore}
              </td>
            </tr>
            `
                : ''
            }
            <tr style="border-bottom: 1px solid #1E293B;">
              <td style="padding: 8px 0; color: #94A3B8;">Evaluation Status</td>
              <td style="padding: 8px 0; text-align: right; color: #10B981; font-weight: 600; text-transform: capitalize;">
                ${extraMetrics?.evaluationStatus?.replace('_', ' ') || 'Completed'}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94A3B8;">Result</td>
              <td style="padding: 8px 0; text-align: right;">
                <span style="display: inline-block; padding: 2px 10px; border-radius: 9999px; font-weight: 700; font-size: 12px; color: ${statusColor}; background: rgba(255,255,255,0.05); border: 1px solid ${statusColor};">
                  ${statusText}
                </span>
              </td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #94A3B8;">Log in to EvalTech to view your detailed result and permitted programming feedback.</p>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${resultLink}" class="btn">View Detailed Examination Result</a>
        </div>
      `
    );
    return this.sendMail(email, `Your EvalTech Examination Result Is Available - ${examTitle}`, html);
  }
}
