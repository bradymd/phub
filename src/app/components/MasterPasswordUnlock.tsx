import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { hashPassword } from '../../utils/crypto';

interface MasterPasswordUnlockProps {
  onUnlockSuccess: (password: string) => void;
}

export default function MasterPasswordUnlock({ onUnlockSuccess }: MasterPasswordUnlockProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter your master password');
      return;
    }

    try {
      setIsProcessing(true);

      // Get stored hash
      const storedHash = localStorage.getItem('master_password_hash');
      if (!storedHash) {
        setError('No master password found. Please reload the app.');
        return;
      }

      // Hash the entered password and compare
      const enteredHash = await hashPassword(password);

      if (enteredHash === storedHash) {
        // Password correct!
        onUnlockSuccess(password);
      } else {
        // Wrong password
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setError(`Incorrect password. Attempt ${newAttempts} of 5.`);
        setPassword('');

        if (newAttempts >= 5) {
          setError('Too many failed attempts. Please reload the page to try again.');
        }
      }
    } catch (err) {
      setError('Failed to verify password. Please try again.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-blue-100 p-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription className="text-base">
            Enter your master password to unlock your Personal Hub
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Master Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="Enter your master password"
                  required
                  disabled={attempts >= 5}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  disabled={attempts >= 5}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {attempts >= 5 && (
              <Alert>
                <AlertDescription>
                  For security, please reload the page to try again.
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isProcessing || attempts >= 5}>
              {isProcessing ? 'Verifying...' : 'Unlock'}
            </Button>

            <div className="text-center text-sm text-gray-600">
              <p>Forgot your password?</p>
              <p className="text-xs text-gray-500 mt-1">
                Unfortunately, passwords cannot be recovered. You may need to clear your browser data and start fresh.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
