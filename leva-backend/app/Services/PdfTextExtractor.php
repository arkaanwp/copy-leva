<?php

namespace App\Services;

use Exception;
use Smalot\PdfParser\Parser;

class PdfTextExtractor
{
    public function extract(string $path): string
    {
        try {
            $parser = new Parser();
            $pdf = $parser->parseFile($path);
            return trim($pdf->getText());
        } catch (Exception $e) {
            throw new \RuntimeException('Failed to extract PDF text: ' . $e->getMessage());
        }
    }
}
