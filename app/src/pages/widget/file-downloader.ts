export function downloadContentAsFile(content: any, fileName: string, fileType: string) {
    // console.log(content);
    const oMyBlob = new Blob([content], {type : fileType});
    const url = URL.createObjectURL(oMyBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();   
}