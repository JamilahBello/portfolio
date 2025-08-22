const { z } = require('zod');
const { objectId } = require('./sharedSchema');

exports.registerStateBody = z.object({
    name: z.string().min(2).max(100),
    code: z.string().min(3).max(3),
})

exports.registerCityBody = z.object({
    name: z.string().min(2).max(100),
    stateId: objectId
})

exports.getStatesQuery = z.object({
    id: objectId
})

exports.getCitiesQuery = z.object({
    id: objectId,
    stateId: objectId
})
