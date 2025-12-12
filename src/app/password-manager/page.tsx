"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser } from "../../lib/api";

import { getApiBase } from "../../lib/apiBase";

const API_BASE = getApiBase();

interface User {
  id: number;
  username: string;
  name: string;
  is_admin: boolean;
}

export default function PasswordManagerPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: "",
    name: "",
    password: "",
    confirmPassword: "",
    is_admin: false,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function checkAccess() {
      try {
        const user = await fetchCurrentUser();
        setIsAdmin(user.is_admin || false);
        
        if (!user.is_admin) {
          router.push("/dashboard");
          return;
        }
        
        await loadUsers();
      } catch (err) {
        console.error("Failed to check access:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    checkAccess();
  }, [router]);

  async function loadUsers() {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        setError("Failed to load users");
      }
    } catch (err) {
      console.error("Failed to load users:", err);
      setError("Failed to load users");
    }
  }

  function handleEditClick(userId: number) {
    setEditingUserId(userId);
    setPasswordData({ newPassword: "", confirmPassword: "" });
    setError("");
    setSuccess("");
  }

  function handleCancelEdit() {
    setEditingUserId(null);
    setPasswordData({ newPassword: "", confirmPassword: "" });
    setError("");
    setSuccess("");
  }

  async function handleUpdatePassword(userId: number) {
    setError("");
    setSuccess("");

    // Validation
    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/password`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          new_password: passwordData.newPassword,
        }),
      });

      if (res.ok) {
        setSuccess("Password updated successfully!");
        setEditingUserId(null);
        setPasswordData({ newPassword: "", confirmPassword: "" });
        // Reload users after a short delay
        setTimeout(() => {
          loadUsers();
        }, 1000);
      } else {
        const data = await res.json();
        setError(data.error || data.message || "Failed to update password");
      }
    } catch (err) {
      console.error("Error updating password:", err);
      setError("Error updating password. Please try again.");
    }
  }

  function handleCancelAddUser() {
    setShowAddUser(false);
    setNewUserData({
      username: "",
      name: "",
      password: "",
      confirmPassword: "",
      is_admin: false,
    });
    setError("");
    setSuccess("");
  }

  async function handleAddUser() {
    setError("");
    setSuccess("");

    // Validation
    if (!newUserData.username || !newUserData.name || !newUserData.password) {
      setError("Username, name, and password are required");
      return;
    }

    if (newUserData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (newUserData.password !== newUserData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: newUserData.username,
          name: newUserData.name,
          password: newUserData.password,
          is_admin: newUserData.is_admin,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(data.message || "User created successfully!");
        setShowAddUser(false);
        setNewUserData({
          username: "",
          name: "",
          password: "",
          confirmPassword: "",
          is_admin: false,
        });
        // Reload users after a short delay
        setTimeout(() => {
          loadUsers();
        }, 1000);
      } else {
        const data = await res.json();
        setError(data.error || data.message || "Failed to create user");
      }
    } catch (err) {
      console.error("Error creating user:", err);
      setError("Error creating user. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-zinc-600">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-1">
            Password Manager
          </h1>
          <p className="text-sm text-zinc-600">
            Manage user passwords
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-800">
            {success}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-zinc-900">
              All Users ({users.length})
            </h2>
            <button
              onClick={() => {
                setShowAddUser(!showAddUser);
                setError("");
                setSuccess("");
                if (showAddUser) {
                  handleCancelAddUser();
                }
              }}
              className="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 active:bg-green-800 transition touch-manipulation"
            >
              {showAddUser ? "Cancel" : "+ Add User"}
            </button>
          </div>

          {showAddUser && (
            <div className="p-4 border-b border-zinc-200 bg-zinc-50">
              <h3 className="text-base font-semibold text-zinc-900 mb-3">
                Add New User
              </h3>
              <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={newUserData.username}
                    onChange={(e) =>
                      setNewUserData({ ...newUserData, username: e.target.value })
                    }
                    placeholder="Enter username"
                    className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newUserData.name}
                    onChange={(e) =>
                      setNewUserData({ ...newUserData, name: e.target.value })
                    }
                    placeholder="Enter full name"
                    className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={newUserData.password}
                    onChange={(e) =>
                      setNewUserData({ ...newUserData, password: e.target.value })
                    }
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={newUserData.confirmPassword}
                    onChange={(e) =>
                      setNewUserData({
                        ...newUserData,
                        confirmPassword: e.target.value,
                      })
                    }
                    placeholder="Confirm password"
                    className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 py-1 touch-manipulation">
                    <input
                      type="checkbox"
                      checked={newUserData.is_admin}
                      onChange={(e) =>
                        setNewUserData({
                          ...newUserData,
                          is_admin: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900"
                    />
                    <span className="text-sm text-zinc-700">
                      Admin privileges
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAddUser}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 active:bg-green-800 transition touch-manipulation"
                >
                  Create User
                </button>
                <button
                  onClick={handleCancelAddUser}
                  className="flex-1 sm:flex-none px-4 py-2.5 border border-zinc-300 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 transition touch-manipulation"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Mobile Card View */}
          <div className="sm:hidden divide-y divide-zinc-100">
            {users.map((user) => (
              <div key={user.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-zinc-900">{user.name}</span>
                      {user.is_admin ? (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                          Admin
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-800 rounded-full">
                          User
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-600">@{user.username}</p>
                  </div>
                </div>
                
                {editingUserId === user.id ? (
                  <div className="space-y-2 pt-3 border-t border-zinc-100">
                    <input
                      type="password"
                      placeholder="New Password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                    />
                    <input
                      type="password"
                      placeholder="Confirm Password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdatePassword(user.id)}
                        className="flex-1 px-4 py-2.5 text-sm bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 active:bg-zinc-700 transition touch-manipulation"
                      >
                        Update
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 px-4 py-2.5 text-sm border border-zinc-300 rounded-xl font-medium text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 transition touch-manipulation"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEditClick(user.id)}
                    className="w-full mt-3 px-4 py-2.5 text-sm bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 active:bg-blue-800 transition touch-manipulation"
                  >
                    Change Password
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left py-3 px-4 text-zinc-700 font-medium">
                    ID
                  </th>
                  <th className="text-left py-3 px-4 text-zinc-700 font-medium">
                    Username
                  </th>
                  <th className="text-left py-3 px-4 text-zinc-700 font-medium">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-zinc-700 font-medium">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 text-zinc-700 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-zinc-100 hover:bg-zinc-50"
                  >
                    <td className="py-3 px-4 text-zinc-900">{user.id}</td>
                    <td className="py-3 px-4 text-zinc-900 font-medium">
                      {user.username}
                    </td>
                    <td className="py-3 px-4 text-zinc-900">{user.name}</td>
                    <td className="py-3 px-4">
                      {user.is_admin ? (
                        <span className="px-2.5 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                          Admin
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-medium bg-zinc-100 text-zinc-800 rounded-full">
                          User
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {editingUserId === user.id ? (
                        <div className="space-y-2">
                          <input
                            type="password"
                            placeholder="New Password"
                            value={passwordData.newPassword}
                            onChange={(e) =>
                              setPasswordData({
                                ...passwordData,
                                newPassword: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                          />
                          <input
                            type="password"
                            placeholder="Confirm Password"
                            value={passwordData.confirmPassword}
                            onChange={(e) =>
                              setPasswordData({
                                ...passwordData,
                                confirmPassword: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdatePassword(user.id)}
                              className="px-3 py-1.5 text-xs bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition"
                            >
                              Update
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 text-xs border border-zinc-300 rounded-lg font-medium text-zinc-700 hover:bg-zinc-100 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditClick(user.id)}
                          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                        >
                          Change Password
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No users found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

