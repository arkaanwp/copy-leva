<?php

namespace App\Services;

use Exception;
use Spatie\PdfToText\Pdf;

class PdfTextExtractor
{
    public function extract(string $path): string
    {
        try {
            return trim(Pdf::getText($path, config('services.pdftotext.binary_path', env('PDF_TO_TEXT_BINARY_PATH'))));
        } catch (Exception $e) {
            throw new \RuntimeException('Failed to extract PDF text: ' . $e->getMessage());
        }
    }
}
