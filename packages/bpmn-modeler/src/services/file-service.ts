export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function downloadFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function openTextFile(
  fileInput: HTMLInputElement
): Promise<{ text: string; name: string } | null> {
  return new Promise((resolve) => {
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return resolve(null);
      const text = await readFileAsText(file);
      resolve({ text, name: file.name });
    };
    fileInput.click();
  });
}

export function resetFileInput(fileInput: HTMLInputElement) {
  fileInput.value = '';
}
