import { Injectable, Logger } from '@nestjs/common';
import sgMail, { MailDataRequired } from '@sendgrid/mail';
import moment from 'moment-timezone';

interface BookingEmailPayload {
  buyerEmail: string;
  creatorEmail: string;
  creatorName?: string | null;
  buyerName?: string | null;
  joinUrl: string;
  startUrl?: string | null;
  startTimeIso: string;
  endTimeIso: string;
  timezone: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail = process.env.SENDGRID_FROM_EMAIL;
  private readonly fromName = process.env.SENDGRID_FROM_NAME || 'SlotChain';

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    } else {
      this.logger.warn('SENDGRID_API_KEY is not configured. Emails disabled.');
    }
  }

  private canSendEmails() {
    return Boolean(process.env.SENDGRID_API_KEY && this.fromEmail);
  }

  async sendBookingEmails(payload: BookingEmailPayload) {
    if (!this.canSendEmails()) {
      this.logger.warn('SendGrid not configured. Skipping email dispatch.');
      return;
    }

    const { joinUrl, startUrl, startTimeIso, endTimeIso, timezone } = payload;
    const startFormatted = moment(startTimeIso)
      .tz(timezone)
      .format('dddd, MMMM D YYYY • h:mm A');
    const endFormatted = moment(endTimeIso)
      .tz(timezone)
      .format('h:mm A z');
    const hostUrl = startUrl || joinUrl;

    const buyerMail: MailDataRequired = {
      to: payload.buyerEmail,
      from: { email: this.fromEmail!, name: this.fromName },
      subject: `Your SlotChain session with ${
        payload.creatorName || 'your creator'
      }`,
      html: `
        <p>Hi ${payload.buyerName || 'there'},</p>
        <p>Your booking with ${payload.creatorName || 'the creator'} is confirmed.</p>
        <p><strong>When:</strong> ${startFormatted} – ${endFormatted}</p>
        <p><strong>Join via Zoom:</strong> <a href="${joinUrl}">${joinUrl}</a></p>
        <p>We recommend joining a couple of minutes early.</p>
        <p>Thanks,<br/>The SlotChain Team</p>
      `,
      text: [
        `Hi ${payload.buyerName || 'there'},`,
        `Your booking with ${
          payload.creatorName || 'the creator'
        } is confirmed.`,
        `When: ${startFormatted} – ${endFormatted}`,
        `Join via Zoom: ${joinUrl}`,
        'We recommend joining a couple of minutes early.',
        'Thanks,',
        'The SlotChain Team',
      ].join('\n'),
    };

    const creatorMail: MailDataRequired = {
      to: payload.creatorEmail,
      from: { email: this.fromEmail!, name: this.fromName },
      subject: `New SlotChain booking with ${payload.buyerName || 'a client'}`,
      html: `
        <p>Hi ${payload.creatorName || 'creator'},</p>
        <p>${payload.buyerName || 'A client'} booked a session with you.</p>
        <p><strong>When:</strong> ${startFormatted} – ${endFormatted}</p>
        <p><strong>Start your Zoom meeting:</strong> <a href="${hostUrl}">${hostUrl}</a></p>
        <p><strong>Guest link:</strong> <a href="${joinUrl}">${joinUrl}</a></p>
        <p>See you there!</p>
        <p>— SlotChain</p>
      `,
      text: [
        `Hi ${payload.creatorName || 'creator'},`,
        `${payload.buyerName || 'A client'} booked a session with you.`,
        `When: ${startFormatted} – ${endFormatted}`,
        `Start your Zoom meeting: ${hostUrl}`,
        `Guest link: ${joinUrl}`,
        'See you there!',
        '— SlotChain',
      ].join('\n'),
    };

    try {
      await sgMail.send([buyerMail, creatorMail]);
    } catch (error) {
      this.logger.error(
        `Failed to send booking emails: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }
}
