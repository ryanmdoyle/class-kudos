import { Button } from "@/app/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card"
import { AddEmailForm } from '@/app/components/user/AddEmailForm'

export function Email() {

  return (
    <div className="bg-green-background min-h-screen min-w-screen p-12 center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Enter Your Email Address</CardTitle>
          <CardDescription>
            Teachers need to provide their email address to unlock all features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddEmailForm />
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button type="submit" form="addEmailForm" className="w-full">
            Add Email
          </Button>
        </CardFooter>
      </Card>

    </div>
  )
}