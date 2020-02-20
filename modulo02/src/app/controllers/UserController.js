import * as Yup from 'yup';

import User from '../models/Users';

class Usercontroller {
  async store(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string().required(),
      email: Yup.string()
        .email()
        .required(),
      password: Yup.string()
        .required()
        .min(6),
    });

    if(!(await schema.isValid(req.body))) {
      return res.status(400).json({ message: 'Validation fails' });
    }

    const userExists = await User.findOne({ where: { email: req.body.email } });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists.' });
    }
    const { id, name, email, provider } = await User.create(req.body);

    return res.json({ id, name, email, provider });
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string(),
      email: Yup.string().email(),
      oldPassword: Yup.string().min(6),
      password: Yup.string()
        .min(6)
        .when('oldPassword', (oldPassword, field) => {
          oldPassword ? field.required() : field;
        }),
      confirmPassword: Yup.string()
        .when('password', (password, field) => {
          password ? field.required().findOne([Yup.ref('password')]) : field;
        }),
    });

    if(!(await schema.isValid(req.body))) {
      return res.status(400).json({ message: 'Validation fails' });
    }

    const { email, oldPassword } = req.body;

    const user = await User.findByPk(req.userId);

    if(email !== user.email) {
      const userExists = await User.findOne({ where: { email } });

      if (userExists) {
        return res.status(400).json({ message: 'User already exists.' });
      }
    }

    if(oldPassword && !(await User.checkPassword(oldPassword))) {
      return res.status(400).json({ message: 'Password does not match' });
    }

    const { id,name,provider } = await User.update(req.body);

    return res.json({ id, name, email, provider });
  }
}

export default new Usercontroller();
