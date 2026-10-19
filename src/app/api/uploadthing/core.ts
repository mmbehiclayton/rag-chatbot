import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@/lib/auth";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define a route for handling pdf curriculum uploads
  curriculumUploader: f({ pdf: { maxFileSize: "64MB", maxFileCount: 1 } })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req: _req }) => {
      // This code runs on your server before upload
      const { userId, role } = await auth();

      // Only Elimu staff upload curriculum designs.
      if (!userId || role !== "SUPERADMIN")
        throw new UploadThingError("Unauthorized");

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { uploaderId: userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log("Upload complete for userId:", metadata.uploaderId);

      // Return data so the client can use it
      return {
        uploadedBy: metadata.uploaderId,
        url: file.ufsUrl,
        name: file.name,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
