import {
  Form,
  FormError,
  FieldError,
  Label,
  TextField,
  Submit,
} from '@redwoodjs/forms'

import { useAuth } from 'src/auth'

const TeacherNewGroupForm = (props) => {
  const { currentUser, isAuthenticated } = useAuth()

  const onSubmit = (data) => {
    data.archived = false
    data.ownerId = currentUser.id
    props.onSave(data, props?.group?.id)
  }

  return (
    <div className="rw-form-wrapper">
      {isAuthenticated ? <p>{currentUser?.email}</p> : <p>logged out</p>}
      <Form onSubmit={onSubmit} error={props.error}>
        <FormError
          error={props.error}
          wrapperClassName="rw-form-error-wrapper"
          titleClassName="rw-form-error-title"
          listClassName="rw-form-error-list"
        />

        <Label
          name="name"
          className="rw-label"
          errorClassName="rw-label rw-label-error"
        >
          Name
        </Label>

        <TextField
          name="name"
          defaultValue={props.group?.name}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="name" className="rw-field-error" />

        <Label
          name="description"
          className="rw-label"
          errorClassName="rw-label rw-label-error"
        >
          Description
        </Label>

        <TextField
          name="description"
          defaultValue={props.group?.description}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
        />

        <FieldError name="description" className="rw-field-error" />

        {/* <Label
          name="ownerId"
          className="rw-label"
          errorClassName="rw-label rw-label-error"
        >
          Owner id
        </Label>

        <TextField
          name="ownerId"
          defaultValue={props.group?.ownerId}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="ownerId" className="rw-field-error" /> */}

        {/* <Label
          name="archived"
          className="rw-label"
          errorClassName="rw-label rw-label-error"
        >
          Archived
        </Label>

        <CheckboxField
          name="archived"
          defaultChecked={props.group?.archived}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
        />

        <FieldError name="archived" className="rw-field-error" /> */}

        <div className="rw-button-group">
          <Submit
            disabled={props.loading}
            className="nes-btn is-success h-[40px]"
          >
            Save
          </Submit>
        </div>
      </Form>
    </div>
  )
}

export default TeacherNewGroupForm
