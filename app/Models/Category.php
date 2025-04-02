<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = [
        'name',
        'published',
    ];

    protected $casts = [
        'published' => 'boolean',
    ];

    public function posts()
    {
        return $this->belongsToMany(Post::class, 'post_categories');
    }
}
