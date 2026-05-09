<?php

namespace App\Services;

use RuntimeException;
use Symfony\Component\Process\Process;

class PdfTextExtractor
{
    public function extract(string $path): string
    {
        $process = new Process(['pdftotext', '-layout', $path, '-']);
        $process->run();

        if (!$process->isSuccessful()) {
            throw new RuntimeException('Failed to extract PDF text.');
        }

        return trim($process->getOutput());
    }
}
