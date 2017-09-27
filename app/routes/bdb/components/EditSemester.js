import styles from './bdb.css';
import React, { Component } from 'react';
import BdbRightNav from './BdbRightNav';
import { Field } from 'redux-form';
import Button from 'app/components/Button';
import { TextInput } from 'app/components/Form';
import LoadingIndicator from 'app/components/LoadingIndicator';
import { Link } from 'react-router';
import SemesterStatusContent from './SemesterStatusContent';
import {
  selectColorCode,
  selectMostProminentStatus,
  getContactedStatuses
} from '../utils.js';

type Props = {
  editSemesterStatus: () => void,
  handleSubmit: () => void,
  company: Object,
  semesterStatus: Object,
  submitting: boolean,
  autoFocus: any
};

export default class EditSemester extends Component {
  constructor(props) {
    super();
    if (props.company && props.semesterStatus) {
      this.state = {
        contactedStatus: props.company.semesterStatuses.find(
          semester => semester.id === props.semesterStatus.id
        ).contactedStatus
      };
    }
  }

  state = {
    contactedStatus: -1
  };

  componentWillReceiveProps(newProps) {
    if (newProps) {
      if (this.state.contactedStatus === -1) {
        this.setState({
          contactedStatus: newProps.semesterStatus.contactedStatus
        });
      }
    }
  }

  onSubmit = ({ contract = '' }) => {
    const { company, semesterStatus, editSemesterStatus } = this.props;
    const { contactedStatus } = this.state;
    editSemesterStatus(
      {
        companyId: company.id,
        semesterId: semesterStatus.id,
        contactedStatus,
        contract
      },
      true
    );
  };

  setContactedStatus = event => {
    this.setState({ contactedStatus: event.target.value });
  };

  props: Props;

  render() {
    const {
      company,
      semesterStatus,
      submitting,
      autoFocus,
      handleSubmit
    } = this.props;

    if (!company || !semesterStatus) {
      return <LoadingIndicator />;
    }

    return (
      <div className={styles.root}>
        <h1>Endre semester</h1>
        <i>
          <Link to={`/bdb/${company.id}`}>{company.name}</Link> sin status for
          <b>
            {semesterStatus.semester === 0 ? ' Vår' : ' Høst'}{' '}
            {semesterStatus.year}
          </b>
        </i>

        <i style={{ display: 'block', marginBottom: '10px' }}>
          <b>Hint:</b> du kan endre status for flere semestere samtidig på
          Bdb-forsiden!
        </i>

        <div className={styles.detail}>
          <div className={styles.leftSection}>
            <form onSubmit={handleSubmit(this.onSubmit)}>
              <Field
                placeholder={'Kontrakt for dette semesteret'}
                autoFocus={autoFocus}
                name="contract"
                component={TextInput.Field}
                className={styles.contractForm}
              />

              <div
                className={
                  styles[
                    selectColorCode(
                      selectMostProminentStatus(semesterStatus.contactedStatus)
                    )
                  ]
                }
                style={{ padding: '20px' }}
              >
                <SemesterStatusContent
                  semesterStatus={semesterStatus}
                  editFunction={statusString =>
                    this.setState({
                      contactedStatus: getContactedStatuses(
                        semesterStatus,
                        statusString
                      )
                    })}
                />
              </div>

              <div className={styles.clear} />
              <Button
                className={styles.submit}
                disabled={submitting}
                submit
                style={{ marginBottom: '0!important' }}
              >
                Lagre
              </Button>
            </form>
          </div>

          <BdbRightNav {...this.props} companyId={company.id} />
        </div>
      </div>
    );
  }
}
