// app/api/send-email/route.ts
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
    try {
        const { to, subject, body, senderName, senderEmail } = await req.json();

        // Check if SMTP environment variables are set
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (!host || !port || !user || !pass) {
            console.error("Missing SMTP credentials in .env");
            return NextResponse.json({ success: false, error: "SMTP credentials not configured on server." }, { status: 500 });
        }

        // Create the transporter
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465, // true for 465, false for other ports like 587
            auth: {
                user,
                pass,
            },
        });

        // Send the email
        const info = await transporter.sendMail({
            from: `"${senderName}" <${user}>`, // Authenticated sender (e.g. notifications@applywizz.com)
            replyTo: senderEmail || user,      // The associate's @applywizz.com email
            to,
            subject,
            text: body,
            // You can also add html: <p>...</p> if you want to support rich text
        });

        console.log("Message sent via SMTP (%s): %s", host, info.messageId);
        return NextResponse.json({ success: true, messageId: info.messageId });

    } catch (error: any) {
        console.error("Error sending email via SMTP:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
