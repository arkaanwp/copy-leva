<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaskMaster extends Model
{
    use HasFactory;

    protected $table = 'tasks_master';

    protected $primaryKey = 'task_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'task_id',
        'user_id',
        'title',
        'status',
        'source_type',
        'source_pdf_hash',
        'source_text',
        'source_description',
        'source_file_path',
        'error_message',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subTasks(): HasMany
    {
        return $this->hasMany(AtomicSubTask::class, 'parent_task_id', 'task_id')
            ->orderBy('order');
    }
}
