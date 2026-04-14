import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@solvera/pace-core/components';
import type { ProfileProgressResult } from '@/shared/lib/profileProgress';

export type ProfilePromptsProps = {
  profileProgress: ProfileProgressResult;
};

/**
 * Summary cards for member, medical, and additional contacts (PR03).
 */
export function ProfilePrompts({ profileProgress }: ProfilePromptsProps) {
  const navigate = useNavigate();
  const pct = Math.round(profileProgress.completionRatio * 100);

  return (
    <section className="grid gap-4 md:grid-cols-3" aria-label="Profile prompts">
      <Card>
        <CardHeader>
          <CardTitle>Member profile</CardTitle>
          <CardDescription>Core member details and membership.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Overall completion about {pct}%.</p>
        </CardContent>
        <CardFooter className="text-right">
          <Button type="button" variant="default" onClick={() => navigate('/member-profile')}>
            Open
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Medical profile</CardTitle>
          <CardDescription>Health and support information.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Review or update medical details.</p>
        </CardContent>
        <CardFooter className="text-right">
          <Button type="button" variant="default" onClick={() => navigate('/medical-profile')}>
            Open
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Additional contacts</CardTitle>
          <CardDescription>Emergency and secondary contacts.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Manage who we can reach besides you.</p>
        </CardContent>
        <CardFooter className="text-right">
          <Button type="button" variant="default" onClick={() => navigate('/additional-contacts')}>
            Open
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
