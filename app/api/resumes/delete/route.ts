import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json(); // e.g. "CRM/1761207062617-test.pdf"

    if (!key) {
      return NextResponse.json({ error: "Missing key/path" }, { status: 400 });
    }

    console.log(`[DELETE] Attempting to delete: ${key}`);

    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
      })
    );

    console.log(`[DELETE] Success: ${key}`);
    return NextResponse.json({ message: "File deleted successfully!", key });
  } catch (err: any) {
    console.error("[DELETE] Failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
