"use client";

import { useState, useEffect } from "react";
import { setupSuperadmin } from "@/app/actions/setup";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SetupSuperadminModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+L (or Cmd+L on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await setupSuperadmin({ username, password });
      
      if (result.success) {
        toast.success("Berhasil", {
          description: "Superadmin berhasil dibuat. Silakan login.",
        });
        setIsOpen(false);
        setUsername("");
        setPassword("");
      } else {
        toast.error("Gagal", {
          description: result.error || "Gagal membuat superadmin.",
        });
        if (result.error?.includes("sudah ada")) {
            setIsOpen(false);
        }
      }
    } catch (error) {
      toast.error("Error", {
        description: "Terjadi kesalahan yang tidak terduga.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Setup Initial Superadmin</DialogTitle>
          <DialogDescription>
            Fitur darurat untuk membuat akun Super Admin dan tim Sekretaris Daerah. Jika Super Admin sudah ada, aksi ini akan ditolak oleh server.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="setup-username">Username Baru</Label>
            <Input
              id="setup-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="superadmin"
              required
              minLength={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="setup-password">Password Baru</Label>
            <Input
              id="setup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              required
              minLength={6}
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Buat Superadmin
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
