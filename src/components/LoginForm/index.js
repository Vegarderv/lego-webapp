import React, { Component, PropTypes } from 'react';
import Button from '../Button';

export default class LoginForm extends Component {

  static propTypes = {
    login: PropTypes.func.isRequired
  };

  handleSubmit(e) {
    e.preventDefault();

    const username = this.refs.username.value.trim();
    const password = this.refs.password.value.trim();

    if (username === '') {
      this.refs.username.focus();
      return;
    }

    if (password === '') {
      this.refs.password.focus();
      return;
    }

    this.props.login(username, password);
  }

  render() {
    return (
      <div className='LoginForm'>
        <form onSubmit={::this.handleSubmit} className='u-vertical'>
          <input type='text' ref='username' placeholder='Username' autoFocus />
          <input type='password' ref='password' placeholder='Password' />
          <Button submit dark>Logg inn</Button>
        </form>
      </div>
    );
  }
}