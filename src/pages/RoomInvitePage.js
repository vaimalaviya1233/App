import React, {useEffect, useMemo, useState, useCallback} from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import _ from 'underscore';
import lodashGet from 'lodash/get';
import ScreenWrapper from '../components/ScreenWrapper';
import HeaderWithBackButton from '../components/HeaderWithBackButton';
import Navigation from '../libs/Navigation/Navigation';
import styles from '../styles/styles';
import compose from '../libs/compose';
import ONYXKEYS from '../ONYXKEYS';
import FormAlertWithSubmitButton from '../components/FormAlertWithSubmitButton';
import * as OptionsListUtils from '../libs/OptionsListUtils';
import CONST from '../CONST';
import withPolicy, {policyDefaultProps, policyPropTypes} from './workspace/withPolicy';
import withReportOrNotFound from './home/report/withReportOrNotFound';
import reportPropTypes from './reportPropTypes';
import FullPageNotFoundView from '../components/BlockingViews/FullPageNotFoundView';
import ROUTES from '../ROUTES';
import * as PolicyUtils from '../libs/PolicyUtils';
import useLocalize from '../hooks/useLocalize';
import SelectionList from '../components/SelectionList';
import * as Report from '../libs/actions/Report';
import Permissions from '../libs/Permissions';

const personalDetailsPropTypes = PropTypes.shape({
    /** The login of the person (either email or phone number) */
    login: PropTypes.string,

    /** The report currently being looked at */
    report: reportPropTypes.isRequired,

    /** The policies which the user has access to and which the report could be tied to */
    policies: PropTypes.shape({
        /** ID of the policy */
        id: PropTypes.string,
    }).isRequired,

    /** The URL of the person's avatar (there should already be a default avatar if
    the person doesn't have their own avatar uploaded yet, except for anon users) */
    avatar: PropTypes.string,

    /** This is either the user's full name, or their login if full name is an empty string */
    displayName: PropTypes.string,
});

const propTypes = {
    /** Beta features list */
    betas: PropTypes.arrayOf(PropTypes.string),

    /** All of the personal details for everyone */
    personalDetails: PropTypes.objectOf(personalDetailsPropTypes),

    /** URL Route params */
    route: PropTypes.shape({
        /** Params from the URL path */
        params: PropTypes.shape({
            /** policyID passed via route: /workspace/:policyID/invite */
            policyID: PropTypes.string,
        }),
    }).isRequired,
    ...policyPropTypes,
};

const defaultProps = {
    personalDetails: {},
    betas: [],
    ...policyDefaultProps,
};

function RoomInvitePage(props) {
    const {translate} = useLocalize();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [personalDetails, setPersonalDetails] = useState([]);
    const [userToInvite, setUserToInvite] = useState(null);

    // Any existing participants and Expensify emails should not be eligible for invitation
    const excludedUsers = useMemo(() => [...lodashGet(props.report, 'participants', []), ...CONST.EXPENSIFY_EMAILS], [props.report]);

    useEffect(() => {
        // Kick the user out if they tried to navigate to this via the URL
        if (Permissions.canUsePolicyRooms(props.betas)) {
            return;
        }
        Navigation.goBack(ROUTES.REPORT_WITH_ID_DETAILS.getRoute(props.report.reportID));

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const inviteOptions = OptionsListUtils.getMemberInviteOptions(props.personalDetails, props.betas, searchTerm, excludedUsers);

        // Update selectedOptions with the latest personalDetails information
        const detailsMap = {};
        _.forEach(inviteOptions.personalDetails, (detail) => (detailsMap[detail.login] = OptionsListUtils.formatMemberForList(detail, false)));
        const newSelectedOptions = [];
        _.forEach(selectedOptions, (option) => {
            newSelectedOptions.push(_.has(detailsMap, option.login) ? {...detailsMap[option.login], isSelected: true} : option);
        });

        setUserToInvite(inviteOptions.userToInvite);
        setPersonalDetails(inviteOptions.personalDetails);
        setSelectedOptions(newSelectedOptions);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- we don't want to recalculate when selectedOptions change
    }, [props.personalDetails, props.betas, searchTerm, excludedUsers, props.report]);

    const getSections = () => {
        const sections = [];
        let indexOffset = 0;

        sections.push({
            title: undefined,
            data: selectedOptions,
            shouldShow: true,
            indexOffset,
        });
        indexOffset += selectedOptions.length;

        // Filtering out selected users from the search results
        const selectedLogins = _.map(selectedOptions, ({login}) => login);
        const personalDetailsWithoutSelected = _.filter(personalDetails, ({login}) => !_.contains(selectedLogins, login));
        const personalDetailsFormatted = _.map(personalDetailsWithoutSelected, (personalDetail) => OptionsListUtils.formatMemberForList(personalDetail, false));
        const hasUnselectedUserToInvite = userToInvite && !_.contains(selectedLogins, userToInvite.login);

        sections.push({
            title: translate('common.contacts'),
            data: personalDetailsFormatted,
            shouldShow: !_.isEmpty(personalDetailsFormatted),
            indexOffset,
        });
        indexOffset += personalDetailsFormatted.length;

        if (hasUnselectedUserToInvite) {
            sections.push({
                title: undefined,
                data: [OptionsListUtils.formatMemberForList(userToInvite, false)],
                shouldShow: true,
                indexOffset,
            });
        }

        return sections;
    };

    const toggleOption = useCallback(
        (option) => {
            const isOptionInList = _.some(selectedOptions, (selectedOption) => selectedOption.login === option.login);

            let newSelectedOptions;
            if (isOptionInList) {
                newSelectedOptions = _.reject(selectedOptions, (selectedOption) => selectedOption.login === option.login);
            } else {
                newSelectedOptions = [...selectedOptions, {...option, isSelected: true}];
            }

            setSelectedOptions(newSelectedOptions);
        },
        [selectedOptions],
    );

    const validate = useCallback(() => {
        const errors = {};
        if (selectedOptions.length <= 0) {
            errors.noUserSelected = true;
        }

        return _.size(errors) <= 0;
    }, [selectedOptions]);

    // Non policy members should not be able to view the participants of a room
    const reportID = useMemo(() => props.report.reportID, [props.report]);
    const isPolicyMember = useMemo(() => PolicyUtils.isPolicyMember(props.report.policyID, props.policies), [props.report, props.policies]);
    const backRoute = useMemo(() => (isPolicyMember ? ROUTES.ROOM_MEMBERS.getRoute(reportID) : ROUTES.REPORT_WITH_ID_DETAILS.getRoute(reportID)), [isPolicyMember, reportID]);
    const inviteUsers = useCallback(() => {
        if (!validate()) {
            return;
        }
        const invitedEmailsToAccountIDs = {};
        _.each(selectedOptions, (option) => {
            const login = option.login || '';
            const accountID = lodashGet(option, 'accountID', '');
            if (!login.toLowerCase().trim() || !accountID) {
                return;
            }
            invitedEmailsToAccountIDs[login] = Number(accountID);
        });
        Report.inviteToRoom(props.report.reportID, invitedEmailsToAccountIDs);
        Navigation.goBack(backRoute);
    }, [selectedOptions, backRoute, props.report, validate]);

    const [policyName, shouldShowAlertPrompt] = useMemo(
        () => [lodashGet(props.policy, 'name'), _.size(lodashGet(props.policy, 'errors', {})) > 0 || lodashGet(props.policy, 'alertMessage', '').length > 0],
        [props.policy],
    );

    const headerMessage = useMemo(() => {
        const searchValue = searchTerm.trim().toLowerCase();
        if (!userToInvite && CONST.EXPENSIFY_EMAILS.includes(searchValue)) {
            return translate('messages.errorMessageInvalidEmail');
        }
        if (!userToInvite && excludedUsers.includes(searchValue)) {
            return translate('messages.userIsAlreadyMemberOfWorkspace', {login: searchValue, workspace: policyName});
        }
        return OptionsListUtils.getHeaderMessage(personalDetails.length !== 0, Boolean(userToInvite), searchValue);
    }, [excludedUsers, translate, searchTerm, policyName, userToInvite, personalDetails]);
    return (
        <ScreenWrapper
            shouldEnableMaxHeight
            testID={RoomInvitePage.displayName}
        >
            {({didScreenTransitionEnd}) => {
                const sections = didScreenTransitionEnd ? getSections() : [];

                return (
                    <FullPageNotFoundView
                        shouldShow={_.isEmpty(props.report)}
                        subtitleKey={_.isEmpty(props.report) ? undefined : 'roomMembersPage.notAuthorized'}
                        onBackButtonPress={() => Navigation.goBack(backRoute)}
                    >
                        <HeaderWithBackButton
                            title={translate('workspace.invite.invitePeople')}
                            subtitle={lodashGet(props.report, 'reportName')}
                            onBackButtonPress={() => {
                                // Policy.clearErrors(props.route.params.policyID);
                                Navigation.goBack(backRoute);
                            }}
                        />
                        <SelectionList
                            canSelectMultiple
                            sections={sections}
                            textInputLabel={translate('optionsSelector.nameEmailOrPhoneNumber')}
                            textInputValue={searchTerm}
                            onChangeText={setSearchTerm}
                            headerMessage={headerMessage}
                            onSelectRow={toggleOption}
                            onConfirm={inviteUsers}
                            showScrollIndicator
                            showLoadingPlaceholder={!didScreenTransitionEnd || !OptionsListUtils.isPersonalDetailsReady(props.personalDetails)}
                        />
                        <View style={[styles.flexShrink0]}>
                            <FormAlertWithSubmitButton
                                isDisabled={!selectedOptions.length}
                                isAlertVisible={shouldShowAlertPrompt}
                                buttonText={translate('common.invite')}
                                onSubmit={inviteUsers}
                                // message={props.policy.alertMessage}
                                containerStyles={[styles.flexReset, styles.flexGrow0, styles.flexShrink0, styles.flexBasisAuto, styles.mb5]}
                                enabledWhenOffline
                                disablePressOnEnter
                            />
                        </View>
                    </FullPageNotFoundView>
                );
            }}
        </ScreenWrapper>
    );
}

RoomInvitePage.propTypes = propTypes;
RoomInvitePage.defaultProps = defaultProps;
RoomInvitePage.displayName = 'RoomInvitePage';

export default compose(
    withPolicy,
    withReportOrNotFound,
    withOnyx({
        personalDetails: {
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
        },
        betas: {
            key: ONYXKEYS.BETAS,
        },
        isLoadingReportData: {
            key: ONYXKEYS.IS_LOADING_REPORT_DATA,
        },
        policies: {
            key: ONYXKEYS.COLLECTION.POLICY,
        },
    }),
)(RoomInvitePage);
