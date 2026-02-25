import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../types/da-types';

interface UserHeaderProps {
  user: User;
  onLogout: () => void;
}

export function UserHeader({ user, onLogout }: UserHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
        <UserIcon className="w-4 h-4 text-white" />
        <div className="text-white">
          <p className="text-sm font-medium">{user.empCode}</p>
          <p className="text-xs text-indigo-100">{user.email}</p>
        </div>
        <Badge className={user.role === 'admin' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-500 hover:bg-blue-600'}>
          {user.role.toUpperCase()}
        </Badge>
      </div>
      <Button
        variant="outline"
        onClick={onLogout}
        className="bg-white/10 text-white border-white/20 hover:bg-white hover:text-indigo-600"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Logout
      </Button>
    </div>
  );
}
