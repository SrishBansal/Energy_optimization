import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename || !filename.endsWith('.csv')) {
        return NextResponse.json({ error: 'Valid CSV filename is required' }, { status: 400 });
    }

    try {
        const filePath = path.join(process.cwd(), 'src/assets/data', filename);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');

        const results = Papa.parse(fileContent, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
        });

        // Clean headers: replace spaces with underscores, though PapaParse keeps original if not transformed.
        // We'll map the headers to ensure they are consistent.
        const cleanedData = results.data.map((row: any) => {
            const cleanRow: any = {};
            for (const key in row) {
                const cleanKey = key.trim().replace(/\s/g, '_');
                cleanRow[cleanKey] = row[key];
            }
            return cleanRow;
        });

        return NextResponse.json(cleanedData);
    } catch (error) {
        console.error('CSV Parsing Error:', error);
        return NextResponse.json({ error: 'Failed to parse CSV' }, { status: 500 });
    }
}
