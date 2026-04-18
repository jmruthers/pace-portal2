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

/** Self-service dashboard vs delegated workspace (PR08 matrix). */
export type ProfilePromptsNavContext =
  | { kind: 'self' }
  | { kind: 'delegated'; memberId: string };

export type ProfilePromptsProps = {
  profileProgress: ProfileProgressResult;
  /** When editing on behalf of a linked profile, prompts route to target-scoped surfaces. */
  navContext?: ProfilePromptsNavContext;
};

/**
 * Summary cards for member, medical, and additional contacts (PR03).
 */
export function ProfilePrompts({ profileProgress, navContext = { kind: 'self' } }: ProfilePromptsProps) {
  const navigate = useNavigate();
  const pct = Math.round(profileProgress.completionRatio * 100);

  const goMemberProfile = () => {
    if (navContext.kind === 'delegated') {
      navigate(`/profile/edit/${navContext.memberId}`);
      return;
    }
    navigate('/member-profile');
  };

  const goAdditionalContacts = () => {
    if (navContext.kind === 'delegated') {
      navigate(`/additional-contacts?targetMemberId=${encodeURIComponent(navContext.memberId)}`);
      return;
    }
    navigate('/additional-contacts');
  };

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
          <Button type="button" variant="default" onClick={goMemberProfile}>
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
          <Button type="button" variant="default" onClick={goAdditionalContacts}>
            Open
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
