export class ExternalApiException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalApiException";
  }
}

export const fetchWithExponentialBackoff = async (
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
): Promise<Response> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new ExternalApiException(
          `HTTP Error: ${response.status} - ${response.statusText}`,
        );
      }
      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }
      const delay = 1000 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new ExternalApiException("Max retries reached unexpectedly");
};
