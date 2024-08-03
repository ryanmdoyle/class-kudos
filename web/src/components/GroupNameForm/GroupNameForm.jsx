import { useState, useEffect } from 'react'

import {
  Form,
  Label,
  TextField,
  FieldError,
  Submit,
  useForm,
} from '@redwoodjs/forms'

const GroupNameForm = (props) => {
  const [isEditing, setIsEditing] = useState(false)
  const formMethods = useForm()

  useEffect(() => {
    if (isEditing) {
      const input = document.getElementById('groupNameTextField')

      document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          input.blur()
        }
      })
    }
  }, [isEditing])

  const onSubmit = async (data) => {
    props.handleNameChange(props.id, data.name)
    setIsEditing(false)
  }

  return (
    <>
      <Form
        formMethods={formMethods}
        config={{ mode: 'onBlur' }}
        onSubmit={onSubmit}
        className="relative"
      >
        <div className="flex justify-center gap-4">
          <Label
            name="name"
            className="label hidden"
            errorClassName="label hidden error"
          />
          <TextField
            id="groupNameTextField"
            name="name"
            className={`input border-4 border-dotted border-gray-400 px-4 py-2 text-2xl outline-0`}
            errorClassName={`input border-4 border-dotted border-red-500 px-4 py-2 text-2xl focus:border-red-500 outline-0`}
            defaultValue={props.name}
            validation={{
              validate: (value) => value.length >= 1,
            }}
            readOnly={!isEditing}
          />
          <FieldError name="name" className=" error-message hidden" />
          {isEditing ? (
            <Submit
              disabled={props.loading}
              className={`button nes-btn is-success text-s h-12 w-32 pb-2`}
            >
              submit
            </Submit>
          ) : (
            <button
              className={`button nes-btn text-s h-12 w-32 pb-2`}
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>
          )}
        </div>
      </Form>
    </>
  )
}

export default GroupNameForm
