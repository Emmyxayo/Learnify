"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@ui/ui/button";
import { Dialog } from "@ui/ui/dialog";
import { Field } from "@ui/ui/field";
import { Input, Select } from "@ui/ui/input";
import { PhoneInput } from "@ui/ui/phone-input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useEnrolStudentManually } from "@app-layer/student/queries";
import { fieldError } from "@shared/lib/field-errors";

/**
 * Putting someone on a course by hand.
 *
 * Until money can change hands on the site, this is how nearly every
 * student gets in: someone paid by transfer, someone was promised a
 * free place, a class is being moved over from wherever it was
 * before. It is also the only way a creator sees their own course the
 * way a student does.
 *
 * The phone number is the only required field because it is the only
 * one that identifies anybody. A name makes the roster readable and
 * an email is for receipts — both are worth asking for and neither is
 * worth blocking on.
 */
export function AddStudent({
  courses,
  courseId: fixedCourseId,
}: {
  /** The creator's published courses. A picker appears when there is
      more than one and the caller has not already chosen. */
  courses: { id: string; title: string }[];
  /** Set on a screen that is already about one course. */
  courseId?: string;
}) {
  const [open, setOpen] = useState(false);
  const enrol = useEnrolStudentManually();

  const [chosen, setChosen] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  /* One course needs no question asked. */
  const only = courses.length === 1 ? courses[0]!.id : "";
  const effective = fixedCourseId || chosen || only;

  const courseTitle = courses.find((c) => c.id === effective)?.title;

  const canSubmit =
    Boolean(effective) &&
    phone.replace(/\D/g, "").length >= 10 &&
    !enrol.isPending;

  function reset() {
    setChosen("");
    setPhone("");
    setFirstName("");
    setLastName("");
    setEmail("");
    enrol.reset();
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function submit() {
    if (!canSubmit) return;
    try {
      await enrol.mutateAsync({
        courseId: effective,
        phone,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        email: email.trim() || null,
      });
      close();
    } catch {
      /* shown by enrol.isError */
    }
  }

  const phoneError = fieldError(enrol.error, "phone");
  const emailError = fieldError(enrol.error, "email");

  /* No course, nowhere to put anybody. The button would open onto a
     dialog whose only honest message is "make a course first". */
  if (courses.length === 0) return null;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" aria-hidden />
        Add a student
      </Button>

      <Dialog
        open={open}
        onClose={close}
        title="Add a student"
        description={
          courseTitle
            ? `They start ${courseTitle} straight away, on the schedule you set.`
            : "They start the course straight away, on the schedule you set."
        }
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={enrol.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!canSubmit}>
              {enrol.isPending && <Spinner label="" />}
              {enrol.isPending ? "Adding" : "Add to course"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* A rejection the server named sits under its own field;
              anything else is said once, here. */}
          {enrol.isError && !phoneError && !emailError && (
            <StatusBanner tone="danger" title="Could not add them">
              {enrol.error instanceof Error && enrol.error.message
                ? enrol.error.message
                : "Check the number and try again."}
            </StatusBanner>
          )}

          {!fixedCourseId && courses.length > 1 && (
            <Field id="add-student-course" label="Course">
              {(props) => (
                <Select
                  {...props}
                  value={chosen}
                  onChange={(e) => setChosen(e.target.value)}
                >
                  <option value="">Pick a course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          <Field
            id="add-student-phone"
            label="Phone number"
            hint="How they are identified, and where their lessons go."
            error={phoneError}
          >
            {(props) => (
              <PhoneInput
                id={props.id}
                describedBy={props["aria-describedby"]}
                invalid={props["aria-invalid"]}
                value={phone}
                onChange={setPhone}
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="add-student-first" label="First name" optional>
              {(props) => (
                <Input
                  {...props}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Grace"
                  autoComplete="off"
                />
              )}
            </Field>

            <Field id="add-student-last" label="Last name" optional>
              {(props) => (
                <Input
                  {...props}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Adeyemi"
                  autoComplete="off"
                />
              )}
            </Field>
          </div>

          <Field
            id="add-student-email"
            label="Email"
            optional
            hint="For receipts. Not needed to take the course."
            error={emailError}
          >
            {(props) => (
              <Input
                {...props}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="grace@example.com"
                autoCapitalize="none"
                spellCheck={false}
              />
            )}
          </Field>
        </div>
      </Dialog>
    </>
  );
}
