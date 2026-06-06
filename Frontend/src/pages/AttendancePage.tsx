import React, { useState, useEffect } from "react";
import api from "../services/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { format } from "date-fns";

const AttendancePage: React.FC = () => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        setLoading(true);
        const data = await api.fetchAttendance(); // You'll need to create this API call
        setAttendance(data.attendance);
        setError(null);
      } catch (err) {
        setError("Failed to fetch attendance data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, []);

  if (loading) return <div>Loading attendance...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Daily Attendance</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>First In</TableHead>
            <TableHead>Last Out</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendance.map((record) => (
            <TableRow key={record.studentId + record.date}>
              <TableCell>{record.studentName}</TableCell>
              <TableCell>{format(new Date(record.date), "PPP")}</TableCell>
              <TableCell>
                {record.firstIn ? format(new Date(record.firstIn), "p") : "N/A"}
              </TableCell>
              <TableCell>
                {record.lastOut ? format(new Date(record.lastOut), "p") : "N/A"}
              </TableCell>
              <TableCell>
                <Badge variant={record.lastOut ? "secondary" : "default"}>
                  {record.lastOut ? "Checked Out" : "Checked In"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AttendancePage; 