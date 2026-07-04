import Modeler from 'bpmn-js/lib/Modeler';

export async function exportToPng(modeler: Modeler, fileName: string) {
  const { svg } = await modeler.saveSVG();
  const canvas = document.createElement('canvas');
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `${fileName}.png`;
    downloadLink.click();
  };
  img.src = url;
}
