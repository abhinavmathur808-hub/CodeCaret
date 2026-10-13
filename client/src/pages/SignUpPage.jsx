import AuthLayout from "../components/f1/AuthLayout";
import F1AssemblyForm from "../components/F1AssemblyForm";

/* Route target for /signup. AuthLayout is the page frame — backdrop,
   columns, legibility scrims — and the assembly form fills its two
   columns with the car stage and the registration panel. */
export default function SignUpPage() {
  return (
    <AuthLayout>
      <F1AssemblyForm />
    </AuthLayout>
  );
}
