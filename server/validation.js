const Joi = require('joi');

const projectSchema = Joi.object({
  code: Joi.string().alphanum().max(20).required(),
  name: Joi.string().max(200).required(),
  description: Joi.string().max(2000).allow(null, ''),
  status: Joi.string().valid('In Progress', 'Completed', 'Archived'),
}).unknown(false);

const projectUpdateSchema = Joi.object({
  name: Joi.string().max(200),
  description: Joi.string().max(2000).allow(null, ''),
  status: Joi.string().valid('In Progress', 'Completed', 'Archived'),
}).unknown(false).min(1);

const taskSchema = Joi.object({
  title: Joi.string().max(500).required(),
  dueDate: Joi.string().allow(null, ''),
  due_date: Joi.string().allow(null, ''),
  assignedTo: Joi.string().max(100).allow(null, ''),
  assigned_to: Joi.string().max(100).allow(null, ''),
  status: Joi.string().valid('PENDING', 'INPROGRESS', 'COMPLETED', 'CANCELLED', 'NOT_DOING'),
  priority: Joi.string().valid('HIGH', 'MEDIUM', 'LOW').allow(null, ''),
  quadrant: Joi.string().valid('DO FIRST', 'SCHEDULE', 'DELEGATE', 'ELIMINATE').allow(null, ''),
  progress: Joi.number().integer().min(0).max(100),
  comments: Joi.string().max(10000).allow(null, ''),
  pinned: Joi.any(),
  sort_order: Joi.number().integer(),
  snoozed_until: Joi.string().allow(null, ''),
}).unknown(true);

const taskUpdateSchema = Joi.object({
  title: Joi.string().max(500),
  dueDate: Joi.string().allow(null, ''),
  due_date: Joi.string().allow(null, ''),
  assignedTo: Joi.string().max(100).allow(null, ''),
  assigned_to: Joi.string().max(100).allow(null, ''),
  status: Joi.string().valid('PENDING', 'INPROGRESS', 'COMPLETED', 'CANCELLED', 'NOT_DOING'),
  priority: Joi.string().valid('HIGH', 'MEDIUM', 'LOW').allow(null, ''),
  quadrant: Joi.string().valid('DO FIRST', 'SCHEDULE', 'DELEGATE', 'ELIMINATE').allow(null, ''),
  progress: Joi.number().integer().min(0).max(100),
  comments: Joi.string().max(10000).allow(null, ''),
  pinned: Joi.any(),
  sort_order: Joi.number().integer(),
  snoozed_until: Joi.string().allow(null, ''),
}).unknown(true);

const tagSchema = Joi.object({
  name: Joi.string().max(100).required(),
  color: Joi.string().max(20).allow(null, ''),
  isContext: Joi.boolean(),
}).unknown(false);

const noteSchema = Joi.object({
  content: Joi.string().max(10000).required(),
}).unknown(true);

const subtaskSchema = Joi.object({
  title: Joi.string().max(500).required(),
}).unknown(true);

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: false });
    if (error) {
      return res.status(400).json({
        error: error.details.map(d => d.message).join(', '),
      });
    }
    req.body = value;
    next();
  };
}

module.exports = {
  validate,
  projectSchema,
  projectUpdateSchema,
  taskSchema,
  taskUpdateSchema,
  tagSchema,
  noteSchema,
  subtaskSchema,
};
