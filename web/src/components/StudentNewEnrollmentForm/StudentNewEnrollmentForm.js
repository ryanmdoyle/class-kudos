import {
  Form,
  FormError,
  FieldError,
  Label,
  TextField,
  NumberField,
  Submit,
} from '@redwoodjs/forms'

const StudentNewEnrollmentForm = (props) => {
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
            name="enrollId"
            className="rw-label"
            errorClassName="rw-label rw-label-error"
          >
            Enroll Id
          </Label>

          <TextField
            name="enrollId"
            defaultValue={props.enrollment?.enrollId}
            className="rw-input"
            errorClassName="rw-input rw-input-error"
            validation={{ required: true }}
          />

          <FieldError name="enrollId" className="rw-field-error" />
        </div>

        <div className="rw-button-group">
          <Submit disabled={props.loading} className="rw-button rw-button-blue">
            Save
          </Submit>
        </div>
      </Form>
    </div>
  )
}

export default StudentNewEnrollmentForm
