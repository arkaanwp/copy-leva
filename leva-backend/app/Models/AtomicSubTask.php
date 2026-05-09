<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AtomicSubTask extends Model
{
    use HasFactory;

    protected $table = 'atomic_sub_tasks';

    protected $primaryKey = 'sub_task_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'sub_task_id',
        'parent_task_id',
        'actionable_title',
        'description',
        'tips',
        'status',
        'category',
        'estimated_duration',
        'recommended_tool_ids',
        'order',
    ];

    protected function casts(): array
    {
        return [
            'recommended_tool_ids' => 'array',
            'order' => 'integer',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(TaskMaster::class, 'parent_task_id', 'task_id');
    }
}
