// src/utils/exportCSV.js
export function exportUsersToCSV(users) {
    const headers = ['Full Name', 'Username', 'Email', 'Role', 'Active', 'Created At'];
    const csvRows = [
      headers.join(','), // header row
      ...users.map(user =>
        [
          user.fullname,
          user.username,
          user.email,
          user.role,
          user.isActive,
          new Date(user.createdAt).toISOString()
        ].join(',')
      )
    ];
    return csvRows.join('\n');
  }
  