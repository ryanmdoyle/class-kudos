import {
  Form,
  FormError,
  FieldError,
  Label,
  TextField,
  NumberField,
  Submit,
} from '@redwoodjs/forms'

const BehaviorForm = (props) => {
  const onSubmit = (data) => {
    const dataWithGroupId = props.groupId
      ? { groupId: props.groupId, ...data }
      : data
    props.onSave(dataWithGroupId, props?.behavior?.id)
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

        <Label
          name="name"
          className="rw-label"
          errorClassName="rw-label rw-label-error"
        >
          Name
        </Label>

        <TextField
          name="name"
          defaultValue={props.behavior?.name}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="name" className="rw-field-error" />

        <Label
          name="value"
          className="rw-label"
          errorClassName="rw-label rw-label-error"
        >
          Value
        </Label>

        <NumberField
          name="value"
          defaultValue={props.behavior?.value}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="value" className="rw-field-error" />

        {/* {!props.groupId && (
          <>
            <Label
              name="groupId"
              className="rw-label"
              errorClassName="rw-label rw-label-error"
            >
              Group id
            </Label>

            <TextField
              name="groupId"
              defaultValue={props.groupId || props.behavior?.groupId}
              className="rw-input"
              errorClassName="rw-input rw-input-error"
            />

            <FieldError name="groupId" className="rw-field-error" />
          </>
        )} */}

        <div className="rw-button-group">
          <Submit disabled={props.loading} className="rw-button rw-button-blue">
            Save
          </Submit>
        </div>
      </Form>
    </div>
  )
}

export default BehaviorForm
