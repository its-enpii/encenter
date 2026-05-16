<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\ServerGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ServerGroupController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $groups = ServerGroup::where('user_id', Auth::id())
            ->withCount('servers')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $groups,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:20',
        ]);

        $group = ServerGroup::create([
            'user_id' => Auth::id(),
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? '#10b981', // Default emerald
        ]);

        ActivityLog::log('CREATE', 'SERVER_GROUP', $group->id, ['name' => $group->name]);

        return response()->json([
            'status' => 'success',
            'message' => 'Server group created successfully',
            'data' => $group,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $group = ServerGroup::where('user_id', Auth::id())
            ->with('servers')
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $group,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $group = ServerGroup::where('user_id', Auth::id())->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:20',
        ]);

        $group->update($validated);

        ActivityLog::log('UPDATE', 'SERVER_GROUP', $group->id, ['name' => $group->name]);

        return response()->json([
            'status' => 'success',
            'message' => 'Server group updated successfully',
            'data' => $group,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $group = ServerGroup::where('user_id', Auth::id())->findOrFail($id);
        $name = $group->name;
        $group->delete();

        ActivityLog::log('DELETE', 'SERVER_GROUP', $id, ['name' => $name]);

        return response()->json([
            'status' => 'success',
            'message' => 'Server group deleted successfully',
        ]);
    }
}
