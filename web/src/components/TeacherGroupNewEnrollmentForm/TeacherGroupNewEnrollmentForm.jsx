import {
  Form,
  FormError,
  FieldError,
  Label,
  TextField,
  NumberField,
  Submit,
} from '@redwoodjs/forms'

const TeacherGroupNewEnrollmentForm = (props) => {
  const onSubmit = (data) => {
    props.onSave(data, props?.enrollment?.id)
  }

  return (
    <div className="rw-form-wrapper">
      <Form onSubmit={onSubmit} error={props.error}>
        <FormError
          error={props.error}
          wrapperClassName="rw-form-error-wrapper"
          titleClassName="rw-form-error-title"
          listClassName="rw-form-error-list"
        />
        <div className="container max-w-md">
          <Label
            name="email"
            className="rw-label"
            errorClassName="rw-label rw-label-error"
          >
            Student Email Address
          </Label>

          <TextField
            name="email"
            className="rw-input"
            errorClassName="rw-input rw-input-error"
            validation={{ required: true }}
          />

          <FieldError name="email" className="rw-field-error" />
        </div>

        <div className="rw-button-group">
          <Submit
            disabled={props.loading}
            className="nes-btn is-success h-10 w-48"
          >
            Add Student
          </Submit>
        </div>
      </Form>
    </div>
  )
}

export default TeacherGroupNewEnrollmentForm
