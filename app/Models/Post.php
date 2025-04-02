<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'content',
        'published',
    ];

    protected $casts = [
        'published' => 'boolean',
    ];

    public function categories()
    {
        return $this->belongsToMany(Category::class, 'post_categories');
    }
}
