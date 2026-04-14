import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle } from '@solvera/pace-core/components';

/**
 * Shown when the authenticated user has no person profile in the current organisation (PR03).
 */
export function ProfileSetupPrompt() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete your profile</CardTitle>
      </CardHeader>
      <CardContent>
        <p>We need a few details before showing your member dashboard.</p>
      </CardContent>
      <CardFooter className="text-right">
        <Button type="button" variant="default" onClick={() => navigate('/profile-complete')}>
          Start setup
        </Button>
      </CardFooter>
    </Card>
  );
}
