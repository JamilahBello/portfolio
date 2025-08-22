import mongoose, { Schema, models, model } from 'mongoose'

const ContactSchema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        subject: { type: String },
        message: { type: String, required: true },
        meta: {
            ua: String,
            ip: String
        }
    },
    { timestamps: true }
)

export type ContactType = {
    name: string
    email: string
    subject?: string
    message: string
    meta?: { ua?: string; ip?: string }
}

export default models.Contact || model('Contact', ContactSchema)