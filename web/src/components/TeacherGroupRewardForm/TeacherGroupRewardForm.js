import {
  Form,
  FormError,
  FieldError,
  Label,
  TextField,
  NumberField,
  CheckboxField,
  Submit,
} from '@redwoodjs/forms'

const RewardForm = (props) => {
  const onSubmit = (data) => {
    data.groupId = props.groupId
    props.onSave(data, props?.reward?.id)
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
          defaultValue={props.reward?.name}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="name" className="rw-field-error" />

        <Label
          name="cost"
          className="rw-label"
          errorClassName="rw-label rw-label-error"
        >
          Cost
        </Label>

        <NumberField
          name="cost"
          defaultValue={props.reward?.cost}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="cost" className="rw-field-error" />

        <Label
          name="responseRequired"
          className="rw-label"
          errorClassName="rw-label rw-label-error"
        >
          Response required
        </Label>

        <CheckboxField
          name="responseRequired"
          defaultChecked={props.reward?.responseRequired}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
        />

        <FieldError name="responseRequired" className="rw-field-error" />

        <Label
          name="responsePrompt"
          className="rw-label"
          errorClassName="rw-label rw-label-error"
        >
          Response prompt
        </Label>

        <TextField
          name="responsePrompt"
          defaultValue={props.reward?.responsePrompt}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
        />

        <FieldError name="responsePrompt" className="rw-field-error" />

        <div className="rw-button-group">
          <Submit disabled={props.loading} className="rw-button rw-button-blue">
            Save
          </Submit>
        </div>
      </Form>
    </div>
  )
}

export default RewardForm
