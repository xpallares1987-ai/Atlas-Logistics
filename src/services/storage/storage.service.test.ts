import { describe, it, expect, beforeEach } from "vitest";
import { StorageService } from "./storage.service.js";

describe("StorageService (S3/MinIO)", () => {
  beforeEach(() => {
    StorageService.resetInstance();
  });

  it("should initialize as a singleton with custom configuration", () => {
    const service1 = StorageService.getInstance({
      bucket: "test-bucket",
      endpoint: "http://localhost:9000",
      region: "eu-west-1",
    });

    const service2 = StorageService.getInstance();

    expect(service1).toBe(service2);
    expect(service1.getBucketName()).toBe("test-bucket");
  });

  it("should generate a presigned PUT upload URL containing bucket, key, and auth query params", async () => {
    const service = StorageService.getInstance({
      bucket: "custom-documents",
      endpoint: "http://127.0.0.1:9000",
      accessKeyId: "testaccess",
      secretAccessKey: "testsecret",
    });

    const url = await service.getPresignedUploadUrl(
      "documents/HBL/sample-001.pdf",
      "application/pdf",
      600,
    );

    expect(url).toBeDefined();
    expect(url).toContain(
      "http://127.0.0.1:9000/custom-documents/documents/HBL/sample-001.pdf",
    );
    expect(url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
    expect(url).toContain("X-Amz-Credential=testaccess");
    expect(url).toContain("X-Amz-Expires=600");
  });

  it("should generate a presigned GET download URL", async () => {
    const service = StorageService.getInstance({
      bucket: "custom-documents",
      endpoint: "http://127.0.0.1:9000",
      accessKeyId: "testaccess",
      secretAccessKey: "testsecret",
    });

    const url = await service.getPresignedDownloadUrl(
      "documents/HBL/sample-001.pdf",
      300,
    );

    expect(url).toBeDefined();
    expect(url).toContain(
      "http://127.0.0.1:9000/custom-documents/documents/HBL/sample-001.pdf",
    );
    expect(url).toContain("X-Amz-Expires=300");
  });
});
