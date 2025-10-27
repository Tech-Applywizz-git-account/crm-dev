import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  console.log("[UPLOAD] Incoming request...");

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    console.warn("[UPLOAD] No file received");
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const arrayBuffer =
  typeof (file as any).arrayBuffer === "function"
    ? await (file as any).arrayBuffer()
    : Buffer.isBuffer(file)
    ? file
    : Buffer.from(await (file as any).text(), "binary");

  const buffer = Buffer.from(arrayBuffer);

  const key = `CRM/${Date.now()}-${file.name}`;
  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  };

  console.log(`[UPLOAD] Uploading to S3: ${key} (${file.size} bytes)`);

  try {
    await s3.send(new PutObjectCommand(uploadParams));

    const publicUrl = `https://${process.env.AWS_S3_BUCKET!}.s3.${process.env.AWS_REGION!}.amazonaws.com/${key}`;

    console.log(`[UPLOAD] Success: ${key}`);
    return NextResponse.json({
      message: "Uploaded successfully!",
      key,
      publicUrl
    });
    
  } catch (err: any) {
    console.error("[UPLOAD] Failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
