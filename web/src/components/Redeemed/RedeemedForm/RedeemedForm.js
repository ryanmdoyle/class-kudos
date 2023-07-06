import {
  Form,
  FormError,
  FieldError,
  Label,
  TextField,
  NumberField,
  CheckboxField,
  DatetimeLocalField,
  Submit,
} from '@redwoodjs/forms'

const formatDatetime = (value) => {
  if (value) {
    return value.replace(/:\d{2}\.\d{3}\w/, '')
  }
}

const RedeemedForm = (props) => {
  const onSubmit = (data) => {
    props.onSave(data, props?.redeemed?.id)
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
          name="userId"
          className="rw-label"
          errorClassName="rw-label rw-label-error"
        >
          User id
        </Label>

        <TextField
          name="userId"
          defaultValue={props.redeemed?.userId}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="userId" className="rw-field-error" />

        <Label
          name="name"
          className="rw-label"
          errorClassName="rw-label rw-label-error"
        >
          Name
        </Label>

        <TextField
          name="name"
          defaultValue={props.redeemed?.name}
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
          defaultValue={props.redeemed?.cost}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="cost" className="rw-field-error" />

        <Label
          name="response"
          className="rw-label"
          errorClassName="rw-label rw-label-error"
        >
          Response
        </Label>

        <TextField
          name="response"
          defaultValue={props.redeemed?.response}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
        />

        <FieldError name="response" className="rw-field-error" />

        <Label
          name="reviewed"
          className="rw-label"
          errorClassName="rw-label rw-label-error"
        >
          Reviewed
        </Label>

        <CheckboxField
          name="reviewed"
          defaultChecked={props.redeemed?.reviewed}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
        />

        <FieldError name="reviewed" className="rw-field-error" />

        <Label
          name="reviewedAt"
          className="rw-label"
          errorClassName="rw-label rw-label-error"
        >
          Reviewed at
        </Label>

        <DatetimeLocalField
          name="reviewedAt"
          defaultValue={formatDatetime(props.redeemed?.reviewedAt)}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
        />

        <FieldError name="reviewedAt" className="rw-field-error" />

        <Label
          name="groupId"
          className="rw-label"
          errorClassName="rw-label rw-label-error"
        >
          Group id
        </Label>

        <TextField
          name="groupId"
          defaultValue={props.redeemed?.groupId}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="groupId" className="rw-field-error" />

        <div className="rw-button-group">
          <Submit disabled={props.loading} className="rw-button rw-button-blue">
            Save
          </Submit>
        </div>
      </Form>
    </div>
  )
}

export default RedeemedForm
