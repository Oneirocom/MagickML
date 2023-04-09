import * as fs from 'fs';
import * as path from 'path';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.min.js'
import * as Tesseract from 'tesseract.js';
import * as mammoth from 'mammoth';
import { PDFPageProxy } from 'pdfjs-dist/types/web/interfaces';

type SupportedFileTypes = 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'ppt' | 'pptx';

interface OCRConfig {
    engine: 'tesseract' | 'other';
    other: any;
}

export async function convertFileToText(file: File, ocrConfig?: OCRConfig): Promise<string> {
    const fileExt = file.name.split('.').pop()!.toLowerCase() as SupportedFileTypes;

    switch (fileExt) {
        case 'pdf':
            return await convertPdfToText(file, ocrConfig?.engine, ocrConfig?.other);
        case 'doc':
        case 'docx':
            return await convertWordToText(file);
        case 'xls':
       /*  case 'xlsx':
            return await convertExcelToText(file); */
        /* case 'ppt':
        case 'pptx':
            return await convertPowerpointToText(file); */
        default:
            throw new Error(`Unsupported file type: ${fileExt}`);
    }
}

export async function numberOfPages(file: File): Promise<number> {
    const fileExt = file.name.split('.').pop()!.toLowerCase() as SupportedFileTypes;

    switch (fileExt) {
        case 'pdf':
            return pdfNumberOfPages(file);
        case 'doc':
        case 'docx':
            return 0;;
        case 'xls':
        case 'xlsx':
            return 0;
        /* case 'ppt':
        case 'pptx':
            return await convertPowerpointToText(file); */
        default:
            throw new Error(`Unsupported file type: ${fileExt}`);
    }
}

async function pdfNumberOfPages(file: File) {
    // Read the PDF file
    const pdfBuffer = await readFileAsBuffer(file);

    // Define the PDF.js worker source path (needed for loading PDF.js)
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    //Load the PDF document
    const pdfDocument = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    return pdfDocument.numPages
}

async function convertPdfToText(file: File, ocrEngine: string = 'tesseract', ocrConfig?: any): Promise<string> {
    // Read the PDF file
    const pdfBuffer = await readFileAsBuffer(file);

    // Define the PDF.js worker source path (needed for loading PDF.js)
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

    // Initialize PDF.js with the worker source path
    //pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

    // Load the PDF document
    const pdfDocument = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;

    let text = '';

    if (ocrEngine === 'tesseract') {
        // Initialize Tesseract.js with the English language
        const worker = await Tesseract.createWorker({
            logger: m => console.log(m)
        });

        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        // Loop through each page of the PDF document
        for (let i = 1; i <= pdfDocument.numPages; i++) {
            // Get the page object
            const page = await pdfDocument.getPage(i);

            // Convert the page to a PNG image buffer
            const pngBuffer = await pdfPageToPngBuffer(page)

            // Convert the PNG image buffer to text using OCR
            //@ts-ignore
            const ocrResult = await worker.recognize(pngBuffer, { lang: 'eng' });
            // Append the OCR result text to the output file
            text += ocrResult.data.text;
        }
    } else {
        // TODO: Implement alternative OCR engine
        throw new Error(`Unsupported OCR engine: ${ocrEngine}`);
    }

    return text;
}

async function convertWordToText(file: File): Promise<string> {
    const arrayBuffer = await readFileAsBuffer(file);
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value.replace(/(<([^>]+)>)/gi, '');
}

/* async function convertExcelToText(file: File): Promise<string> {
    const arrayBuffer = await readFileAsBuffer(file);
    // Read the Excel file
    const workbook = xlsx.read(arrayBuffer, { type: 'array' });

    let text = '';

    // Loop through each worksheet in the workbook
    for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        // Convert the worksheet to an array of rows
        const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        // Append the rows to the output file
        for (const row of rows) {
            text += row.join('\t') + '\n';
        }
    }

    return text;
} */

async function pdfPageToPngBuffer(pdfPage: PDFPageProxy): Promise<Uint8Array> {
    const canvas = document.createElement('canvas');
    const viewport = pdfPage.getViewport({ scale: 1.0 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    const renderContext: any = {
        canvasContext: ctx,
        viewport: viewport
    };
    const renderTask: any = pdfPage.render(renderContext);
    await renderTask.promise;
    const blob = await (await fetch(canvas.toDataURL('image/png'))).blob();
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
}

async function readFileAsBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to read file as ArrayBuffer'));
            }
        };
        reader.onerror = () => {
            reject(reader.error);
        };
        reader.readAsArrayBuffer(file);
    });
}


