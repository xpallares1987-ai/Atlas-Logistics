import React, { useEffect, useState } from "react";
import { useFirebase } from "@/components";
import { getAllUsers, updateUserRole } from "@dataconnect/generated";
import { Shield, ShieldAlert, ShieldCheck, User } from "lucide-react";
import { useAuth } from "../components/auth/AuthProvider";

interface UserModel {
  uid: string;
  email: string;
  role: string;
}

const AVAILABLE_ROLES = [
  "ADMIN",
  "EXECUTIVE",
  "MANAGER",
  "TEAM LEADER",
  "SALES",
  "OPERATOR",
  "GUEST",
];

export default function UserManagement() {
  const { dataConnect } = useFirebase();
  const { role: currentUserRole } = useAuth();
  const [users, setUsers] = useState<UserModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUserRole === "ADMIN") {
      fetchUsers();
    }
  }, [dataConnect, currentUserRole]);

  const fetchUsers = async () => {
    if (!dataConnect) return;
    setLoading(true);
    try {
      const response = await getAllUsers(dataConnect);
      setUsers(response.data.users);
    } catch (err: any) {
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: string) => {
    if (!dataConnect) return;
    try {
      // Optimistic update
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)),
      );
      await updateUserRole(dataConnect, { uid, role: newRole });
    } catch (err: any) {
      setError(err.message || "Failed to update role");
      fetchUsers(); // Revert on failure
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case "OPERATOR":
        return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      case "CLIENT":
        return <Shield className="w-4 h-4 text-emerald-500" />;
      default:
        return <User className="w-4 h-4 text-slate-400" />;
    }
  };

  if (currentUserRole !== "ADMIN") {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center flex flex-col items-center justify-center">
        <ShieldAlert className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2">
          Only administrators can manage users and roles.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Team & Permissions
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Manage platform access and role-based privileges.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Refresh List
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Current Role</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-8 text-center text-slate-400"
                >
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-8 text-center text-slate-400"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.uid}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                        {user.email.charAt(0)}
                      </div>
                      <div className="font-medium text-slate-700">
                        {user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      <span className="text-sm font-medium text-slate-600">
                        {user.role}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <select
                      className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 ml-auto cursor-pointer"
                      value={user.role}
                      onChange={(e) =>
                        handleRoleChange(user.uid, e.target.value)
                      }
                    >
                      {AVAILABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
