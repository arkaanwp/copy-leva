<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScrapedTool extends Model
{
    use HasFactory;

    protected $table = 'scraped_tools';

    protected $fillable = [
        'name',
        'url',
        'description',
        'category',
        'pricing_type',
        'rating',
        'qdrant_uuid',
        'scraped_at',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'integer',
            'rating' => 'float',
            'scraped_at' => 'datetime',
        ];
    }
}
