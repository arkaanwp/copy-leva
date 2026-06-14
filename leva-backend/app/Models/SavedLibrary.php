<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavedLibrary extends Model
{
    use HasFactory;

    protected $table = 'saved_libraries';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'tool_id',
        'utility_priority',
        'semantic_keywords',
        'tagging_status',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'semantic_keywords' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tool(): BelongsTo
    {
        return $this->belongsTo(ScrapedTool::class, 'tool_id');
    }
}
